import { test } from "node:test";
import { createHmac } from "node:crypto";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import partial from "../../triggers/new-partial-response.ts";
import anyEvent from "../../triggers/any-event.ts";
import { parseEventTypes } from "../../lib/triggers.ts";

// Round 3: the explicit `event_types` triggers. Signatures are computed here with node:crypto.
const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const SECRET = "test-secret";
const CALLBACK = "https://api.example.test/triggers/webhooks/sub_1";

// Non-canonical whitespace: JSON.stringify(JSON.parse(b)) !== b.
const body = (type: string, form = "lT9Z2j") =>
  `{ "event_id" : "EVT1",  "event_type":"${type}",
  "form_response": { "form_id":"${form}", "token":"tok1", "submitted_at":"2026-11-10T10:15:00Z",
  "landed_at":"2026-11-10T10:14:00Z", "hidden":{"a":"b"}, "definition":{"id":"${form}","title":"Feedback"},
  "answers":[{"type":"text","text":"hi","field":{"id":"Q1"}}] } }`;
const PARTIAL = body("form_response_partial");
const FULL = body("form_response");

const sign = (b: string, secret = SECRET) =>
  "sha256=" + createHmac("sha256", secret).update(b).digest("base64");

const call = (b: string, over: Record<string, unknown> = {}, raw: string | null = b) => ({
  raw: {
    method: "POST",
    path: "/",
    query: {},
    headers: { "typeform-signature": sign(b) } as Record<string, string>,
    body: raw === null ? null : JSON.parse(raw),
    ...(raw === null ? {} : { rawBody: raw }),
    ...over,
  },
  params: { formId: "lT9Z2j" } as { formId: string; events?: string },
  state: {
    formId: "lT9Z2j",
    tag: "w6w-sub1",
    secret: SECRET as string | null,
    events: ["form_response_partial"],
  },
  subscriptionId: "sub_1",
});

type Input = ReturnType<typeof call>;
const CASES = [
  { name: "new-partial-response", t: partial, ok: PARTIAL, other: FULL },
  { name: "any-event", t: anyEvent, ok: PARTIAL, other: FULL },
];

test("fixtures have non-canonical whitespace", () => {
  for (const b of [PARTIAL, FULL]) assert(JSON.stringify(JSON.parse(b)) !== b);
});

test("app wires the new webhook triggers with output and sample", () => {
  const keys = app.triggers.map((t) => t.key);
  assert(keys.includes("new-partial-response") && keys.includes("any-event"));
  for (const { t } of CASES) {
    assert(t.output!.length > 0 && t.sample !== undefined, t.key);
    assertEquals(typeof t.onSubscribe, "function");
    assertEquals(typeof t.onUnsubscribe, "function");
    assertEquals(t.poll, undefined);
  }
});

for (const { name, t, ok, other } of CASES) {
  const ingest = (i: Input) => t.handleIngest!(i, mockCtx().ctx);

  test(`${name}: valid signature → one normalized partial-response event`, async () => {
    const out = evs(await ingest(call(ok))) as Array<Record<string, unknown>>;
    assertEquals(out.length, 1);
    assertEquals(out[0].eventType, "form_response_partial");
    assertEquals(out[0].responseId, "tok1");
    assertEquals(out[0].formTitle, "Feedback");
  });

  test(`${name}: a signed delivery of an event not subscribed to → no event`, async () => {
    assertEquals(evs(await ingest(call(other))), []);
  });

  test(`${name}: a signed delivery for another form → no event`, async () => {
    assertEquals(evs(await ingest(call(body("form_response_partial", "other1")))), []);
  });

  test(`${name}: one flipped byte of the SIGNATURE → refused`, async () => {
    const good = sign(ok);
    // base64 ends in "="; flip the last character before it.
    const i = good.length - 2;
    const bad = good.slice(0, i) + (good[i] === "A" ? "B" : "A") + good.slice(i + 1);
    assert(bad !== good);
    await assertRejects(
      () => ingest(call(ok, { headers: { "typeform-signature": bad } })),
      Error,
      "signature does not match",
    );
  });

  test(`${name}: one flipped byte of the BODY → refused`, async () => {
    await assertRejects(
      () => ingest(call(ok, {}, ok.replace("hi", "ho"))),
      Error,
      "signature does not match",
    );
  });

  test(`${name}: signature under another key → refused`, async () => {
    await assertRejects(
      () => ingest(call(ok, { headers: { "typeform-signature": sign(ok, "other-key") } })),
      Error,
      "signature does not match",
    );
  });

  test(`${name}: header missing or empty → refused`, async () => {
    for (const headers of [{}, { "typeform-signature": "" }]) {
      await assertRejects(() => ingest(call(ok, { headers })), Error, "header is missing");
    }
  });

  test(`${name}: rawBody absent → refused, even with a correct signature`, async () => {
    await assertRejects(() => ingest(call(ok, {}, null)), Error, "raw body");
  });

  test(`${name}: unset or empty secret + absent or empty header → refused before any compare`, async () => {
    for (const secret of [null, ""]) {
      for (const headers of [{}, { "typeform-signature": "" }]) {
        const input = call(ok, { headers });
        input.state.secret = secret;
        await assertRejects(() => ingest(input), Error, "secret");
      }
    }
  });

  test(`${name}: errors never echo the secret or the signature`, async () => {
    const h = sign(ok, "other-key");
    try {
      await ingest(call(ok, { headers: { "typeform-signature": h } }));
      assert(false, "must throw");
    } catch (e) {
      const m = (e as Error).message;
      assert(!m.includes(SECRET) && !m.includes(h) && !m.includes(h.slice(7)), m);
    }
  });

  test(`${name}: a non-POST call is refused`, async () => {
    await assertRejects(() => ingest(call(ok, { method: "GET" })), Error, "POST");
  });

  test(`${name}: onUnsubscribe DELETEs the webhook; 404/410 are already gone; 500 propagates`, async () => {
    const input = { params: { formId: "lT9Z2j" }, state: call(ok).state, subscriptionId: "s" };
    const done = mockCtx([{ status: 204 }]);
    await t.onUnsubscribe!(input, done.ctx);
    assertEquals(done.calls[0].method, "DELETE");
    assertEquals(done.calls[0].url, "https://api.typeform.com/forms/lT9Z2j/webhooks/w6w-sub1");
    for (const status of [404, 410]) {
      await t.onUnsubscribe!(input, mockCtx([{ status, body: { code: "NOT_FOUND" } }]).ctx);
    }
    await assertRejects(
      () => t.onUnsubscribe!(input, mockCtx([{ status: 500, body: {} }]).ctx),
      Error,
      "500",
    );
  });
}

test("new-partial-response onSubscribe PUTs the webhook with only form_response_partial on", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const state = await partial.onSubscribe!(
    { params: { formId: " lT9Z2j " }, subscriptionId: "sub_1", callbackUrl: CALLBACK, hostUrl: "" },
    ctx,
  ) as { secret: string };
  assertEquals(calls.length, 1);
  assertEquals([calls[0].method, calls[0].url], [
    "PUT",
    "https://api.typeform.com/forms/lT9Z2j/webhooks/w6w-sub_1",
  ]);
  const sent = JSON.parse(calls[0].body!);
  assert(/^[0-9a-f]{64}$/.test(sent.secret));
  assertEquals({ ...sent, secret: "S" }, {
    url: CALLBACK,
    enabled: true,
    secret: "S",
    verify_ssl: true,
    event_types: { form_response: false, form_response_partial: true },
  });
  assertEquals(state, {
    formId: "lT9Z2j",
    tag: "w6w-sub_1",
    secret: sent.secret,
    events: ["form_response_partial"],
  });
});

test("any-event onSubscribe: empty = both events; a list is sent as event_types", async () => {
  for (
    const [events, want] of [
      [undefined, { form_response: true, form_response_partial: true }],
      ["", { form_response: true, form_response_partial: true }],
      ["form_response", { form_response: true, form_response_partial: false }],
      ["form_response_partial, form_response", {
        form_response: true,
        form_response_partial: true,
      }],
    ] as const
  ) {
    const { ctx, calls } = mockCtx([{ body: {} }]);
    await anyEvent.onSubscribe!(
      {
        params: { formId: "lT9Z2j", events },
        subscriptionId: "sub_1",
        callbackUrl: CALLBACK,
        hostUrl: "",
      },
      ctx,
    );
    assertEquals(JSON.parse(calls[0].body!).event_types, want);
  }
});

test("any-event: an unknown event or a missing form fails before any request", async () => {
  for (
    const [params, msg] of [
      [{ formId: "lT9Z2j", events: "form_response, nope" }, "nope"],
      [{ formId: " " }, "Choose the Typeform form"],
    ] as const
  ) {
    const { ctx, calls } = mockCtx([{ body: {} }]);
    await assertRejects(
      () =>
        anyEvent.onSubscribe!(
          { params, subscriptionId: "s", callbackUrl: CALLBACK, hostUrl: "" },
          ctx,
        ),
      Error,
      msg,
    );
    assertEquals(calls.length, 0);
  }
});

test("any-event: the stored event list filters deliveries", async () => {
  const input = call(FULL);
  input.state.events = ["form_response_partial"];
  assertEquals(evs(await anyEvent.handleIngest!(input, mockCtx().ctx)), []);
  input.state.events = ["form_response", "form_response_partial"];
  assertEquals(evs(await anyEvent.handleIngest!(input, mockCtx().ctx)).length, 1);
});

test("parseEventTypes", () => {
  assertEquals(parseEventTypes(""), ["form_response", "form_response_partial"]);
  assertEquals(parseEventTypes("form_response form_response"), ["form_response"]);
});
