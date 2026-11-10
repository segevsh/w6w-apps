import { test } from "node:test";
import { createHmac } from "node:crypto";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";

const SECRET = "test-secret";
const CALLBACK = "https://api.example.test/triggers/webhooks/sub_1";

/** Narrow the `E[] | { events, response? }` union (brief §3). */
const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);

// Non-canonical whitespace: JSON.stringify(JSON.parse(body)) !== body.
const body = (topic: string, item: string) =>
  `{ "type" : "notification_event",  "app_id":"abc123",
  "id":"notif_1", "topic":"${topic}", "created_at": 1762683300,
  "data": { "type":"notification_event_data", "item": ${item} } }`;

/** Expected signature, computed independently of the app with node:crypto. */
const sign = (b: string, secret = SECRET) =>
  "sha1=" + createHmac("sha1", secret).update(b).digest("hex");

/** Positions of the hex digest (after `sha1=`) to flip: first, middle and last. */
const flipPositions = (sig: string) => [5, Math.floor((5 + sig.length) / 2), sig.length - 1];
/** The same string with the character at `at` changed to a different one. */
const flipAt = (s: string, at: number) => {
  const out = s.slice(0, at) + (s[at] === "0" ? "1" : "0") + s.slice(at + 1);
  assert(out !== s && out.length === s.length);
  return out;
};

const trigger = (key: string) => {
  const t = app.triggers.find((x) => x.key === key);
  assert(t !== undefined, `trigger ${key} is not in the app`);
  return t as unknown as {
    key: string;
    params: Array<{ key: string; type: string; required?: boolean }>;
    output: unknown[];
    sample: unknown;
    poll?: unknown;
    onSubscribe: (i: unknown, c: unknown) => Promise<unknown>;
    onUnsubscribe: (i: unknown, c: unknown) => Promise<void>;
    handleIngest: (i: unknown, c: unknown) => Promise<unknown>;
  };
};

function input(
  b: string | null,
  over: { headers?: Record<string, string>; secret?: string | null; params?: object } = {},
) {
  const raw: Record<string, unknown> = {
    method: "POST",
    path: "/",
    query: {},
    headers: over.headers ?? (b === null ? {} : { "x-hub-signature": sign(b) }),
    body: b === null ? null : JSON.parse(b),
  };
  if (b !== null) raw.rawBody = b;
  return {
    raw,
    params: {
      signingSecret: over.secret === null ? undefined : over.secret ?? SECRET,
      ...over.params,
    },
    state: { callbackUrl: CALLBACK },
    subscriptionId: "sub_1",
  };
}

const ingest = (key: string, i: unknown) => trigger(key).handleIngest(i, mockCtx().ctx);

/** key -> topics the trigger fires on (literal, from the Intercom webhook topic catalog). */
const TOPICS: Record<string, string[]> = {
  "conversation-created": ["conversation.user.created"],
  "contact-created": ["contact.user.created"],
  "new-contact": ["contact.user.created", "contact.lead.created"],
  "contact-updated": ["contact.user.updated", "contact.lead.updated"],
  "contact-deleted": ["contact.deleted"],
  "company-created": ["company.created"],
  "company-updated": ["company.updated"],
  "company-deleted": ["company.deleted"],
  "new-conversation": ["conversation.user.created", "conversation.admin.single.created"],
  "conversation-user-replied": ["conversation.user.replied"],
  "conversation-admin-replied": ["conversation.admin.replied"],
  "conversation-closed": ["conversation.admin.closed"],
  "conversation-assigned": ["conversation.admin.assigned"],
  "conversation-deleted": ["conversation.deleted"],
};

for (const [key, topics] of Object.entries(TOPICS)) {
  const ok = body(topics[0], `{"type":"x","id":"item-1"}`);

  test(`${key}: fixture body has non-canonical whitespace`, () => {
    assert(JSON.stringify(JSON.parse(ok)) !== ok);
  });

  test(`${key}: every topic it names yields one normalized event`, async () => {
    for (const topic of topics) {
      const b = body(topic, `{"type":"x","id":"item-1"}`);
      const out = evs(await ingest(key, input(b))) as Array<Record<string, unknown>>;
      assertEquals(out, [{
        notificationId: "notif_1",
        topic,
        appId: "abc123",
        createdAt: 1762683300,
        itemId: "item-1",
        item: { type: "x", id: "item-1" },
      }]);
    }
  });

  test(`${key}: one flipped byte of the SIGNATURE (first, middle, last) → refused`, async () => {
    const good = sign(ok);
    for (const at of flipPositions(good)) {
      await assertRejects(
        () => ingest(key, input(ok, { headers: { "x-hub-signature": flipAt(good, at) } })),
        Error,
        "signature",
      );
    }
  });

  test(`${key}: one flipped byte of the body → refused`, async () => {
    const i = input(ok);
    (i.raw as { rawBody: string }).rawBody = ok.replace("item-1", "item-2");
    await assertRejects(() => ingest(key, i), Error, "signature");
  });

  test(`${key}: a signature over the re-serialised body does not verify`, async () => {
    const reserialised = JSON.stringify(JSON.parse(ok));
    await assertRejects(
      () => ingest(key, input(ok, { headers: { "x-hub-signature": sign(reserialised) } })),
      Error,
      "signature",
    );
  });

  test(`${key}: header missing → refused; rawBody absent → refused`, async () => {
    await assertRejects(() => ingest(key, input(ok, { headers: {} })), Error, "X-Hub-Signature");
    const i = input(ok);
    delete (i.raw as { rawBody?: string }).rawBody;
    await assertRejects(() => ingest(key, i), Error, "raw body");
  });

  test(`${key}: unset or empty secret → refused first, even with an absent or empty header`, async () => {
    for (const secret of [null, ""]) {
      for (const headers of [{}, { "x-hub-signature": "" }]) {
        await assertRejects(() => ingest(key, input(ok, { headers, secret })), Error, "secret");
      }
    }
  });

  test(`${key}: another verified topic is acknowledged with no event`, async () => {
    const other = body("ticket.created", `{"type":"ticket","id":"t1"}`);
    assertEquals(evs(await ingest(key, input(other))), []);
  });

  test(`${key}: webhook shape (output, sample, manual subscribe, no poll)`, async () => {
    const t = trigger(key);
    assert(t.output.length > 0);
    assert(t.sample !== undefined);
    assertEquals(t.poll, undefined);
    assertEquals(t.params.map((p) => p.key), ["signingSecret"]);
    const { ctx, calls } = mockCtx();
    const state = await t.onSubscribe({
      params: {},
      subscriptionId: "sub_1",
      callbackUrl: CALLBACK,
      hostUrl: "",
    }, ctx);
    assertEquals(state, { callbackUrl: CALLBACK });
    await t.onUnsubscribe({ params: {}, state, subscriptionId: "sub_1" }, ctx);
    assertEquals(calls.length, 0);
  });
}

// ---- Any event ----

const ANY_BODY = body("conversation.admin.closed", `{"type":"conversation","id":"c-9"}`);
const PING = body("ping", `{"type":"ping","message":"hello"}`);

test("any-event: empty events list runs on every verified topic except ping", async () => {
  const out = evs(await ingest("any-event", input(ANY_BODY))) as Array<Record<string, unknown>>;
  assertEquals(out.length, 1);
  assertEquals(out[0].topic, "conversation.admin.closed");
  assertEquals(out[0].itemId, "c-9");
  assertEquals(evs(await ingest("any-event", input(PING))), []);
});

test("any-event: a listed topic is emitted, an unlisted one is filtered out", async () => {
  const params = { events: "ticket.created , conversation.admin.closed" };
  assertEquals(evs(await ingest("any-event", input(ANY_BODY, { params }))).length, 1);
  const other = body("contact.deleted", `{"type":"contact","id":"c1"}`);
  assertEquals(evs(await ingest("any-event", input(other, { params }))), []);
  // ping runs only when it is listed explicitly
  assertEquals(
    evs(await ingest("any-event", input(PING, { params: { events: "ping" } }))).length,
    1,
  );
});

test("any-event: one flipped byte of the SIGNATURE (first, middle, last) → refused", async () => {
  const good = sign(ANY_BODY);
  for (const at of flipPositions(good)) {
    await assertRejects(
      () =>
        ingest(
          "any-event",
          input(ANY_BODY, { headers: { "x-hub-signature": flipAt(good, at) } }),
        ),
      Error,
      "signature",
    );
  }
});

test("any-event: tampered body, missing header, absent rawBody and unset secret → refused", async () => {
  const i = input(ANY_BODY);
  (i.raw as { rawBody: string }).rawBody = ANY_BODY.replace("c-9", "c-8");
  await assertRejects(() => ingest("any-event", i), Error, "signature");
  await assertRejects(
    () => ingest("any-event", input(ANY_BODY, { headers: {} })),
    Error,
    "X-Hub-Signature",
  );
  const noRaw = input(ANY_BODY);
  delete (noRaw.raw as { rawBody?: string }).rawBody;
  await assertRejects(() => ingest("any-event", noRaw), Error, "raw body");
  for (const secret of [null, ""]) {
    await assertRejects(
      () => ingest("any-event", input(ANY_BODY, { headers: {}, secret })),
      Error,
      "secret",
    );
  }
});

test("any-event: declares signingSecret (required secret) and an optional events string", () => {
  const t = trigger("any-event");
  assertEquals(t.params.map((p) => [p.key, p.type, p.required === true]), [
    ["signingSecret", "secret", true],
    ["events", "string", false],
  ]);
  assert(t.output.length > 0);
  assert(t.sample !== undefined);
  assertEquals(t.poll, undefined);
});
