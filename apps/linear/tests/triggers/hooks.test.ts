import { test } from "node:test";
import { createHmac } from "node:crypto";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import type { HookContext, TriggerCall } from "@w6w/types";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import issue from "../../triggers/issue.ts";
import comment from "../../triggers/comment.ts";
import type { TriggerState } from "../../lib/triggers.ts";

const CALLBACK = "https://api.example.test/triggers/webhooks/sub_abc";
const HOST = "https://api.example.test";
const SECRET = "s3cr3t-signing-key-for-tests-0123456789";
const STATE: TriggerState = {
  webhookId: "790ce3f6-ea44-473d-bbd9-f3c73dc745a9",
  resourceType: "Issue",
  secret: SECRET,
};

/** Narrow the `E[] | { events, response? }` union (brief §3) before indexing. */
const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);

/** A Linear delivery body with non-canonical whitespace, stamped `tsMs`. */
const bodyAt = (tsMs: number, type = "Issue", action = "update") =>
  `{ "action" : "${action}", "type":"${type}",  "actor": {"name":"Linear Orbit"},\n "data" : {"id":"2174add1","title":"T"}, "updatedFrom": {"title":"Old"},\n "url":"https://linear.app/acme/issue/ENG-1/t", "createdAt":"2026-11-09T10:00:00.000Z", "webhookTimestamp" : ${tsMs}, "webhookId":"wh_1" }`;
const NOW = Date.now();
const BODY = bodyAt(NOW);
const sign = (body: string, secret = SECRET) =>
  createHmac("sha256", secret).update(body).digest("hex");

function call(rawBody: string | undefined, headers: Record<string, string>): TriggerCall {
  const c: TriggerCall = {
    method: "POST",
    path: "/triggers/webhooks/sub_abc",
    query: {},
    headers,
    body: rawBody === undefined ? null : JSON.parse(rawBody),
  };
  if (rawBody !== undefined) c.rawBody = rawBody;
  return c;
}

function ingest(
  trigger: typeof issue,
  raw: TriggerCall,
  opts: { state?: Partial<TriggerState>; params?: Record<string, unknown> } = {},
) {
  const state = "state" in opts ? opts.state : STATE;
  return trigger.handleIngest!(
    { raw, params: opts.params ?? {}, state: state as TriggerState, subscriptionId: "sub_abc" },
    mockCtx().ctx,
  );
}

const goodHeaders = (body = BODY) => ({
  "linear-signature": sign(body),
  "linear-delivery": "234d1a4e",
  "linear-event": "Issue",
});

test("app: seven webhook triggers, each with output and sample", () => {
  assertEquals(app.triggers.map((t) => t.key), [
    "issue",
    "comment",
    "project",
    "cycle",
    "issue-label",
    "user",
    "any-event",
  ]);
  for (const t of app.triggers) {
    assert(t.output!.length > 0, `${t.key} output`);
    assert(t.sample !== undefined, `${t.key} sample`);
    assert(typeof t.onSubscribe === "function" && typeof t.onUnsubscribe === "function");
    assert(typeof t.handleIngest === "function");
    assertEquals(typeof (t as { poll?: unknown }).poll, "undefined");
  }
});

test("the fixture body is not canonical JSON", () => {
  assert(JSON.stringify(JSON.parse(BODY)) !== BODY);
});

test("valid signature over a non-canonical raw body -> one event", async () => {
  assertEquals(evs(await ingest(issue, call(BODY, goodHeaders()))), [{
    resourceType: "Issue",
    action: "update",
    deliveryId: "234d1a4e",
    id: "2174add1",
    url: "https://linear.app/acme/issue/ENG-1/t",
    actor: "Linear Orbit",
    createdAt: "2026-11-09T10:00:00.000Z",
    data: { id: "2174add1", title: "T" },
    updatedFrom: { title: "Old" },
  }]);
});

test("a signature computed over the re-serialised body is refused", async () => {
  await assertRejects(
    () =>
      ingest(
        issue,
        call(BODY, {
          ...goodHeaders(),
          "linear-signature": sign(JSON.stringify(JSON.parse(BODY))),
        }),
      ),
    Error,
    "signature does not match",
  );
});

test("one flipped byte in the body is refused", async () => {
  await assertRejects(
    () => ingest(issue, call(BODY.replace('"T"', '"U"'), goodHeaders(BODY))),
    Error,
    "signature does not match",
  );
});

test("a signature made with another secret is refused", async () => {
  await assertRejects(
    () => ingest(issue, call(BODY, { ...goodHeaders(), "linear-signature": sign(BODY, "other") })),
    Error,
    "signature does not match",
  );
});

test("signature header missing is refused", async () => {
  const { "linear-signature": _drop, ...rest } = goodHeaders();
  await assertRejects(() => ingest(issue, call(BODY, rest)), Error, "signature does not match");
});

test("a stale or future webhookTimestamp is refused, even with a valid signature over it", async () => {
  for (const ts of [NOW - 61_000 - 5_000, NOW + 61_000 + 5_000]) {
    const body = bodyAt(ts);
    await assertRejects(
      () => ingest(issue, call(body, goodHeaders(body))),
      Error,
      "60-second window",
    );
  }
  const near = bodyAt(Date.now() - 30_000);
  assertEquals(evs(await ingest(issue, call(near, goodHeaders(near)))).length, 1);
});

test("a missing or non-numeric webhookTimestamp is refused", async () => {
  for (
    const body of [
      `{ "action":"create","type":"Issue","data":{"id":"1"} }`,
      `{ "action":"create","type":"Issue","data":{"id":"1"},"webhookTimestamp":"${NOW}" }`,
    ]
  ) {
    await assertRejects(
      () => ingest(issue, call(body, goodHeaders(body))),
      Error,
      "60-second window",
    );
  }
});

test("rawBody absent is refused", async () => {
  await assertRejects(() => ingest(issue, call(undefined, goodHeaders())), Error, "raw body");
});

test("unset or empty stored secret is refused, even with the header absent", async () => {
  for (const state of [undefined, { ...STATE, secret: "" }, { ...STATE, secret: undefined }]) {
    await assertRejects(() => ingest(issue, call(BODY, {}), { state }), Error, "secret");
    await assertRejects(
      () => ingest(issue, call(BODY, goodHeaders()), { state }),
      Error,
      "secret",
    );
  }
});

test("a non-POST call is refused", async () => {
  await assertRejects(
    () => ingest(issue, { ...call(BODY, goodHeaders()), method: "GET" }),
    Error,
    "POST",
  );
});

test("error text never echoes the secret, a signature or a header value", async () => {
  const bad = sign(BODY, "other");
  const stale = bodyAt(NOW - 999_999);
  const cases: Array<() => Promise<unknown>> = [
    () => ingest(issue, call(BODY, { ...goodHeaders(), "linear-signature": bad })),
    () => ingest(issue, call(undefined, goodHeaders())),
    () => ingest(issue, call(stale, goodHeaders(stale))),
    () => ingest(issue, call(BODY, goodHeaders()), { state: { ...STATE, secret: "" } }),
  ];
  for (const run of cases) {
    let threw: Error | undefined;
    try {
      await run();
    } catch (err) {
      threw = err as Error;
    }
    assert(threw, "should have thrown");
    const m = threw!.message;
    for (const leak of [SECRET, bad, sign(BODY), "234d1a4e", String(NOW)]) {
      assert(!m.includes(leak));
    }
  }
});

test("another resource type yields no event (verified first)", async () => {
  const body = bodyAt(Date.now(), "Comment", "create");
  assertEquals(evs(await ingest(issue, call(body, goodHeaders(body)))), []);
  assertEquals(evs(await ingest(comment, call(body, goodHeaders(body)))).length, 1);
});

test("actions filter keeps only the named actions", async () => {
  const raw = call(BODY, goodHeaders());
  assertEquals(evs(await ingest(issue, raw, { params: { actions: "create, update" } })).length, 1);
  assertEquals(evs(await ingest(issue, raw, { params: { actions: "remove" } })), []);
});

// ── onSubscribe / onUnsubscribe ─────────────────────────────────────────────

function subscribe(params: Record<string, unknown>, ctx: HookContext) {
  return issue.onSubscribe!(
    { params, subscriptionId: "sub_abc", callbackUrl: CALLBACK, hostUrl: HOST },
    ctx,
  ) as Promise<TriggerState>;
}

const gql = (body: string | null) =>
  JSON.parse(body!) as {
    query: string;
    variables: Record<string, unknown>;
  };

test("onSubscribe: deletes a leftover webhook, creates one with a secret, stores it", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        data: {
          webhooks: {
            nodes: [
              { id: "old-1", url: CALLBACK },
              { id: "other", url: "https://elsewhere.test/hook" },
            ],
          },
        },
      },
    },
    { body: { data: { webhookDelete: { success: true } } } },
    {
      body: {
        data: {
          webhookCreate: {
            success: true,
            webhook: { id: "790ce3f6-ea44-473d-bbd9-f3c73dc745a9", enabled: true },
          },
        },
      },
    },
  ]);
  const state = await subscribe({ teamId: "72b2a2dc-6f4f-4423-9d34-24b5bd10634a" }, ctx);
  assertEquals(calls.length, 3);
  for (const c of calls) {
    assertEquals([c.method, c.url], ["POST", "https://api.linear.app/graphql"]);
  }
  assertEquals(gql(calls[0].body).query.includes("webhooks(first: 100)"), true);
  assertEquals(gql(calls[1].body).query.includes("webhookDelete(id: $id)"), true);
  assertEquals(gql(calls[1].body).variables, { id: "old-1" });
  assertEquals(gql(calls[2].body).query.includes("webhookCreate(input: $input)"), true);
  assert(/^[0-9a-f]{64}$/.test(state.secret));
  assertEquals(gql(calls[2].body).variables, {
    input: {
      url: CALLBACK,
      label: "w6w trigger",
      resourceTypes: ["Issue"],
      secret: state.secret,
      enabled: true,
      teamId: "72b2a2dc-6f4f-4423-9d34-24b5bd10634a",
    },
  });
  assertEquals(state, {
    webhookId: "790ce3f6-ea44-473d-bbd9-f3c73dc745a9",
    resourceType: "Issue",
    secret: state.secret,
  });
});

test("onSubscribe: no team means every public team; a fresh secret each time", async () => {
  const make = () =>
    mockCtx([
      { body: { data: { webhooks: { nodes: [] } } } },
      { body: { data: { webhookCreate: { success: true, webhook: { id: "w" } } } } },
    ]);
  const first = make();
  const a = await subscribe({}, first.ctx);
  const b = await subscribe({ teamId: "  " }, make().ctx);
  assertEquals(gql(first.calls[1].body).variables.input, {
    url: CALLBACK,
    label: "w6w trigger",
    resourceTypes: ["Issue"],
    secret: a.secret,
    enabled: true,
    allPublicTeams: true,
  });
  assert(a.secret !== b.secret);
});

test("onSubscribe: success false or no id is an error", async () => {
  const { ctx } = mockCtx([
    { body: { data: { webhooks: { nodes: [] } } } },
    { body: { data: { webhookCreate: { success: false } } } },
  ]);
  await assertRejects(() => subscribe({}, ctx), Error, "did not create");
});

test("onUnsubscribe: webhookDelete by id; a missing entity counts as already gone", async () => {
  {
    const { ctx, calls } = mockCtx([{ body: { data: { webhookDelete: { success: true } } } }]);
    await issue.onUnsubscribe!({ params: {}, state: STATE, subscriptionId: "sub_abc" }, ctx);
    assertEquals(gql(calls[0].body).variables, { id: "790ce3f6-ea44-473d-bbd9-f3c73dc745a9" });
    assertEquals(gql(calls[0].body).query.includes("webhookDelete(id: $id)"), true);
  }
  {
    const { ctx } = mockCtx([{ body: { errors: [{ message: "Entity not found: Webhook" }] } }]);
    await issue.onUnsubscribe!({ params: {}, state: STATE, subscriptionId: "sub_abc" }, ctx);
  }
  const { ctx } = mockCtx([{ body: { errors: [{ message: "Forbidden: admin only" }] } }]);
  await assertRejects(
    () => issue.onUnsubscribe!({ params: {}, state: STATE, subscriptionId: "sub_abc" }, ctx),
    Error,
    "Forbidden",
  );
});

test("onUnsubscribe: no recorded webhook, no request", async () => {
  const { ctx, calls } = mockCtx();
  await issue.onUnsubscribe!({ params: {}, state: {} as TriggerState, subscriptionId: "s" }, ctx);
  assertEquals(calls.length, 0);
});
