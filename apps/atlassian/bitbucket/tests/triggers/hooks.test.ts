import { test } from "node:test";
import { createHmac } from "node:crypto";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import type { HookContext, TriggerCall } from "@w6w/types";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import push from "../../triggers/push.ts";
import pullRequestMerged from "../../triggers/pull-request-merged.ts";
import type { TriggerState } from "../../lib/triggers.ts";

const CALLBACK = "https://api.example.test/triggers/webhooks/sub_abc";
const HOST = "https://api.example.test";
const SECRET = "s3cr3t-signing-key-for-tests-0123456789";
const STATE: TriggerState = {
  hookId: "b4f2a1c0-1111-2222-3333-444455556666",
  workspace: "teamsinspace",
  repoSlug: "documentation-tests",
  event: "repo:push",
  secret: SECRET,
};

/** Narrow the `E[] | { events, response? }` union (brief §3) before indexing. */
const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);

/** Non-canonical whitespace: `JSON.stringify(JSON.parse(BODY)) !== BODY`. */
const BODY =
  `{ "push" : { "changes": [ {"new":{"name":"main"}} ] },\n "repository":{"full_name":"teamsinspace/documentation-tests"},  "actor" : {"display_name":"Emma"} }`;
const sign = (body: string, secret = SECRET) =>
  "sha256=" + createHmac("sha256", secret).update(body).digest("hex");

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
  trigger: typeof push,
  raw: TriggerCall,
  opts: { state?: Partial<TriggerState> } = {},
) {
  const state = "state" in opts ? opts.state : STATE;
  return trigger.handleIngest!(
    { raw, params: {}, state: state as TriggerState, subscriptionId: "sub_abc" },
    mockCtx().ctx,
  );
}

const goodHeaders = (body = BODY, event = "repo:push") => ({
  "x-event-key": event,
  "x-request-uuid": "9c1d-req",
  "x-hook-uuid": "b4f2a1c0",
  "x-hub-signature": sign(body),
});

test("app: seven webhook triggers, each with output and sample", () => {
  assertEquals(app.triggers.map((t) => t.key), [
    "push",
    "pull-request-created",
    "pull-request-updated",
    "pull-request-merged",
    "pull-request-declined",
    "pull-request-comment",
    "issue-created",
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
  assertEquals(evs(await ingest(push, call(BODY, goodHeaders()))), [{
    event: "repo:push",
    deliveryId: "9c1d-req",
    repository: "teamsinspace/documentation-tests",
    actor: "Emma",
    payload: JSON.parse(BODY),
  }]);
});

test("the documented test vector signs as the vendor says", () => {
  // https://support.atlassian.com/bitbucket-cloud/docs/manage-webhooks/ "Testing the webhook payload validation"
  assertEquals(
    sign("Hello World!", "It's a Secret to Everybody"),
    "sha256=a4771c39fbe90f317c7824e83ddef3caae9cb3d976c214ace1f2937e133263c9",
  );
});

test("a signature computed over the re-serialised body is refused", async () => {
  await assertRejects(
    () =>
      ingest(
        push,
        call(BODY, {
          ...goodHeaders(),
          "x-hub-signature": sign(JSON.stringify(JSON.parse(BODY))),
        }),
      ),
    Error,
    "signature does not match",
  );
});

test("one flipped byte in the body is refused", async () => {
  await assertRejects(
    () => ingest(push, call(BODY.replace("Emma", "Emmb"), goodHeaders(BODY))),
    Error,
    "signature does not match",
  );
});

test("a signature made with another secret is refused", async () => {
  await assertRejects(
    () => ingest(push, call(BODY, { ...goodHeaders(), "x-hub-signature": sign(BODY, "other") })),
    Error,
    "signature does not match",
  );
});

test("signature header missing is refused", async () => {
  const { "x-hub-signature": _drop, ...rest } = goodHeaders();
  await assertRejects(() => ingest(push, call(BODY, rest)), Error, "signature does not match");
});

test("rawBody absent is refused", async () => {
  await assertRejects(() => ingest(push, call(undefined, goodHeaders())), Error, "raw body");
});

test("unset or empty stored secret is refused, even with the header absent", async () => {
  const { "x-hub-signature": _drop, ...noSig } = goodHeaders();
  for (const state of [undefined, { ...STATE, secret: "" }, { ...STATE, secret: undefined }]) {
    await assertRejects(() => ingest(push, call(BODY, noSig), { state }), Error, "secret");
    await assertRejects(
      () => ingest(push, call(BODY, goodHeaders()), { state }),
      Error,
      "secret",
    );
  }
});

test("a non-POST call is refused", async () => {
  await assertRejects(
    () => ingest(push, { ...call(BODY, goodHeaders()), method: "GET" }),
    Error,
    "POST",
  );
});

test("error text never echoes the secret, a signature or a header value", async () => {
  const bad = sign(BODY, "other");
  const cases: Array<() => Promise<unknown>> = [
    () => ingest(push, call(BODY, { ...goodHeaders(), "x-hub-signature": bad })),
    () => ingest(push, call(undefined, goodHeaders())),
    () => ingest(push, call(BODY, goodHeaders()), { state: { ...STATE, secret: "" } }),
  ];
  for (const run of cases) {
    try {
      await run();
      assert(false, "should have thrown");
    } catch (err) {
      const m = (err as Error).message;
      for (const leak of [SECRET, bad, sign(BODY), "9c1d-req"]) assert(!m.includes(leak));
    }
  }
});

test("another event key yields no event (verified first)", async () => {
  assertEquals(
    evs(await ingest(push, call(BODY, goodHeaders(BODY, "pullrequest:created")))),
    [],
  );
  await assertRejects(
    () =>
      ingest(
        push,
        call(BODY, {
          ...goodHeaders(BODY, "diagnostics:ping"),
          "x-hub-signature": "sha256=00",
        }),
      ),
    Error,
    "signature does not match",
  );
});

test("pull-request-merged keeps only pullrequest:fulfilled", async () => {
  const body = `{ "pullrequest" : {"id": 1, "state":"MERGED"}, "actor": {"display_name":"Emma"} }`;
  const out = evs(
    await ingest(pullRequestMerged, call(body, goodHeaders(body, "pullrequest:fulfilled"))),
  );
  assertEquals((out[0] as { event: string }).event, "pullrequest:fulfilled");
  assertEquals(evs(await ingest(pullRequestMerged, call(body, goodHeaders(body)))), []);
});

// ── onSubscribe / onUnsubscribe ─────────────────────────────────────────────

function subscribe(params: Record<string, unknown>, ctx: HookContext) {
  return push.onSubscribe!(
    { params, subscriptionId: "sub_abc", callbackUrl: CALLBACK, hostUrl: HOST },
    ctx,
  ) as Promise<TriggerState>;
}

test("onSubscribe: deletes a leftover hook, creates one with a secret, stores it", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        values: [
          { uuid: "{old-uuid-1}", url: CALLBACK },
          { uuid: "{other}", url: "https://elsewhere.test/hook" },
        ],
      },
    },
    { status: 204 },
    { status: 201, body: { uuid: "{b4f2a1c0-1111-2222-3333-444455556666}" } },
  ]);
  const state = await subscribe(
    { workspace: "teamsinspace", repoSlug: "documentation-tests" },
    ctx,
  );
  const base = "https://api.bitbucket.org/2.0/repositories/teamsinspace/documentation-tests/hooks";
  assertEquals(calls.length, 3);
  assertEquals([calls[0].method, calls[0].url], ["GET", `${base}?pagelen=100`]);
  assertEquals([calls[1].method, calls[1].url], ["DELETE", `${base}/old-uuid-1`]);
  assertEquals([calls[2].method, calls[2].url], ["POST", base]);
  assert(/^[0-9a-f]{64}$/.test(state.secret));
  assertEquals(JSON.parse(calls[2].body!), {
    description: "w6w trigger",
    url: CALLBACK,
    active: true,
    secret: state.secret,
    events: ["repo:push"],
  });
  assertEquals(state, {
    hookId: "b4f2a1c0-1111-2222-3333-444455556666",
    workspace: "teamsinspace",
    repoSlug: "documentation-tests",
    event: "repo:push",
    secret: state.secret,
  });
});

test("onSubscribe: a fresh secret per subscription; workspace and repository required", async () => {
  const make = () =>
    mockCtx([{ body: { values: [] } }, { status: 201, body: { uuid: "{u}" } }]).ctx;
  const a = await subscribe({ workspace: "w", repoSlug: "r" }, make());
  const b = await subscribe({ workspace: "w", repoSlug: "r" }, make());
  assert(a.secret !== b.secret);
  const { ctx, calls } = mockCtx();
  await assertRejects(() => subscribe({ repoSlug: "r" }, ctx), Error, "Workspace");
  await assertRejects(() => subscribe({ workspace: "w" }, ctx), Error, "Repository");
  assertEquals(calls.length, 0);
});

test("onSubscribe: a create with no uuid in the answer is an error", async () => {
  const { ctx } = mockCtx([{ body: { values: [] } }, { status: 201, body: {} }]);
  await assertRejects(() => subscribe({ workspace: "w", repoSlug: "r" }, ctx), Error, "no uuid");
});

test("onUnsubscribe: DELETEs the hook; 404 and 410 count as already gone", async () => {
  for (const status of [204, 404, 410]) {
    const { ctx, calls } = mockCtx([{ status }]);
    await push.onUnsubscribe!({ params: {}, state: STATE, subscriptionId: "sub_abc" }, ctx);
    assertEquals([calls[0].method, calls[0].url], [
      "DELETE",
      "https://api.bitbucket.org/2.0/repositories/teamsinspace/documentation-tests/hooks/b4f2a1c0-1111-2222-3333-444455556666",
    ]);
  }
  const { ctx } = mockCtx([{ status: 500 }]);
  await assertRejects(
    () => push.onUnsubscribe!({ params: {}, state: STATE, subscriptionId: "sub_abc" }, ctx),
    Error,
    "Bitbucket 500",
  );
});

test("onUnsubscribe: no recorded hook, no request", async () => {
  const { ctx, calls } = mockCtx();
  await push.onUnsubscribe!({ params: {}, state: {} as TriggerState, subscriptionId: "s" }, ctx);
  assertEquals(calls.length, 0);
});
