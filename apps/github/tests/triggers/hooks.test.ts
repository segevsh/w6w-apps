import { test } from "node:test";
import { createHmac } from "node:crypto";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import type { HookContext, TriggerCall } from "@w6w/types";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import push from "../../triggers/push.ts";
import pullRequest from "../../triggers/pull-request.ts";
import type { TriggerState } from "../../lib/triggers.ts";

const CALLBACK = "https://api.example.test/triggers/webhooks/sub_abc";
const HOST = "https://api.example.test";
const SECRET = "s3cr3t-signing-key-for-tests-0123456789";
const STATE: TriggerState = {
  hookId: "12345678",
  owner: "octocat",
  repository: "Hello-World",
  event: "push",
  secret: SECRET,
};

/** Narrow the `E[] | { events, response? }` union (brief §3) before indexing. */
const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);

/** Non-canonical whitespace: `JSON.stringify(JSON.parse(BODY)) !== BODY`, so a re-serialising verifier fails. */
const BODY =
  `{ "ref" : "refs/heads/main",\n  "after":"a1b2c3",  "commits": [ {"id":"a1b2c3"} ],\n "repository": {"full_name":"octocat/Hello-World"}, "sender" : {"login":"octocat"} }`;
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
  opts: { state?: Partial<TriggerState>; params?: Record<string, unknown> } = {},
) {
  // `"state" in opts` so a test can pass `state: undefined` (no subscription state at all).
  const state = "state" in opts ? opts.state : STATE;
  return trigger.handleIngest!(
    { raw, params: opts.params ?? {}, state: state as TriggerState, subscriptionId: "sub_abc" },
    mockCtx().ctx,
  );
}

const goodHeaders = (body = BODY, event = "push") => ({
  "x-github-event": event,
  "x-github-delivery": "72d3162e-cc78",
  "x-hub-signature-256": sign(body),
});

// ── declaration ─────────────────────────────────────────────────────────────

test("app: fifteen webhook triggers, each with output and sample, signature-verifying", () => {
  const keys = app.triggers.map((t) => t.key);
  assertEquals(keys, [
    "push",
    "pull-request",
    "issue",
    "issue-comment",
    "release",
    "workflow-run",
    "pull-request-review",
    "pull-request-review-comment",
    "ref-created",
    "ref-deleted",
    "repository-event",
    "workflow-job",
    "star",
    "fork",
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

// ── signature: the failure modes ────────────────────────────────────────────

test("the fixture body is not canonical JSON", () => {
  assert(JSON.stringify(JSON.parse(BODY)) !== BODY);
});

test("valid signature over a non-canonical raw body -> one event", async () => {
  const out = evs(await ingest(push, call(BODY, goodHeaders())));
  assertEquals(out, [{
    event: "push",
    action: null,
    deliveryId: "72d3162e-cc78",
    repository: "octocat/Hello-World",
    sender: "octocat",
    payload: JSON.parse(BODY),
  }]);
});

test("a signature computed over the re-serialised body is refused", async () => {
  const resigned = sign(JSON.stringify(JSON.parse(BODY)));
  await assertRejects(
    () => ingest(push, call(BODY, { ...goodHeaders(), "x-hub-signature-256": resigned })),
    Error,
    "signature does not match",
  );
});

test("one flipped byte in the body is refused", async () => {
  const flipped = BODY.replace("a1b2c3", "a1b2c4");
  await assertRejects(
    () => ingest(push, call(flipped, goodHeaders(BODY))),
    Error,
    "signature does not match",
  );
});

test("a signature made with another secret is refused", async () => {
  await assertRejects(
    () =>
      ingest(push, call(BODY, { ...goodHeaders(), "x-hub-signature-256": sign(BODY, "other") })),
    Error,
    "signature does not match",
  );
});

test("signature header missing is refused", async () => {
  const { "x-hub-signature-256": _drop, ...rest } = goodHeaders();
  await assertRejects(() => ingest(push, call(BODY, rest)), Error, "signature does not match");
});

test("the legacy sha1 header is not accepted in place of sha256", async () => {
  const { "x-hub-signature-256": _drop, ...rest } = goodHeaders();
  const sha1 = "sha1=" + createHmac("sha1", SECRET).update(BODY).digest("hex");
  await assertRejects(
    () => ingest(push, call(BODY, { ...rest, "x-hub-signature": sha1 })),
    Error,
    "signature does not match",
  );
});

test("rawBody absent is refused", async () => {
  await assertRejects(() => ingest(push, call(undefined, goodHeaders())), Error, "raw body");
});

test("unset or empty stored secret is refused, even with the header absent", async () => {
  const { "x-hub-signature-256": _drop, ...noSig } = goodHeaders();
  for (const state of [undefined, { ...STATE, secret: "" }, { ...STATE, secret: undefined }]) {
    await assertRejects(
      () => ingest(push, call(BODY, noSig), { state }),
      Error,
      "secret",
    );
    await assertRejects(
      () => ingest(push, call(BODY, goodHeaders()), { state }),
      Error,
      "secret",
    );
  }
});

test("a non-POST call is refused", async () => {
  const c = { ...call(BODY, goodHeaders()), method: "GET" };
  await assertRejects(() => ingest(push, c), Error, "POST");
});

test("error text never echoes the secret, a signature or a header value", async () => {
  const bad = sign(BODY, "other");
  const cases: Array<() => Promise<unknown>> = [
    () => ingest(push, call(BODY, { ...goodHeaders(), "x-hub-signature-256": bad })),
    () => ingest(push, call(undefined, goodHeaders())),
    () => ingest(push, call(BODY, goodHeaders()), { state: { ...STATE, secret: "" } }),
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
    for (const leak of [SECRET, bad, sign(BODY), "72d3162e-cc78"]) assert(!m.includes(leak));
  }
});

// ── after verification ──────────────────────────────────────────────────────

test("ping yields no event (verified first)", async () => {
  const ping = `{ "zen" : "Keep it logically awesome.", "hook_id": 1 }`;
  assertEquals(evs(await ingest(push, call(ping, goodHeaders(ping, "ping")))), []);
  await assertRejects(
    () =>
      ingest(
        push,
        call(ping, { ...goodHeaders(ping, "ping"), "x-hub-signature-256": "sha256=00" }),
      ),
    Error,
    "signature does not match",
  );
});

test("an event type the trigger did not ask for yields no event", async () => {
  assertEquals(evs(await ingest(push, call(BODY, goodHeaders(BODY, "issues")))), []);
});

test("actions filter keeps only the named actions", async () => {
  const body =
    `{ "action" : "closed", "number": 7, "pull_request": {"title":"t"}, "repository": {"full_name":"o/r"} }`;
  const headers = goodHeaders(body, "pull_request");
  const kept = evs(
    await ingest(pullRequest, call(body, headers), { params: { actions: "opened, closed" } }),
  );
  assertEquals(kept.length, 1);
  assertEquals((kept[0] as { action: string }).action, "closed");
  assertEquals(
    evs(await ingest(pullRequest, call(body, headers), { params: { actions: "opened" } })),
    [],
  );
  assertEquals(evs(await ingest(pullRequest, call(body, headers), { params: {} })).length, 1);
});

// ── onSubscribe / onUnsubscribe ─────────────────────────────────────────────

function subscribe(params: Record<string, unknown>, ctx: HookContext) {
  return push.onSubscribe!(
    { params, subscriptionId: "sub_abc", callbackUrl: CALLBACK, hostUrl: HOST },
    ctx,
  ) as Promise<TriggerState>;
}

test("onSubscribe: deletes a leftover hook at the callback URL, creates one, stores the secret", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: [
        { id: 11, config: { url: CALLBACK } },
        { id: 12, config: { url: "https://elsewhere.test/hook" } },
      ],
    },
    { status: 204 },
    { status: 201, body: { id: 12345678 } },
  ]);
  const state = await subscribe({ owner: "octocat", repository: "Hello-World" }, ctx);
  assertEquals(calls.length, 3);
  assertEquals([calls[0].method, calls[0].url], [
    "GET",
    "https://api.github.com/repos/octocat/Hello-World/hooks?per_page=100",
  ]);
  assertEquals([calls[1].method, calls[1].url], [
    "DELETE",
    "https://api.github.com/repos/octocat/Hello-World/hooks/11",
  ]);
  assertEquals([calls[2].method, calls[2].url], [
    "POST",
    "https://api.github.com/repos/octocat/Hello-World/hooks",
  ]);
  assert(/^[0-9a-f]{64}$/.test(state.secret));
  assertEquals(JSON.parse(calls[2].body!), {
    name: "web",
    active: true,
    events: ["push"],
    config: { url: CALLBACK, content_type: "json", secret: state.secret, insecure_ssl: "0" },
  });
  assertEquals(state, {
    hookId: "12345678",
    owner: "octocat",
    repository: "Hello-World",
    event: "push",
    secret: state.secret,
  });
});

test("onSubscribe: a fresh secret per subscription", async () => {
  const make = () => mockCtx([{ body: [] }, { status: 201, body: { id: 1 } }]);
  const a = await subscribe({ owner: "o", repository: "r" }, make().ctx);
  const b = await subscribe({ owner: "o", repository: "r" }, make().ctx);
  assert(a.secret !== b.secret);
});

test("onSubscribe: owner and repository are required; no request is made", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(() => subscribe({ repository: "r" }, ctx), Error, "Owner");
  await assertRejects(() => subscribe({ owner: "o", repository: " " }, ctx), Error, "Repository");
  assertEquals(calls.length, 0);
});

test("onSubscribe: a create with no id in the answer is an error", async () => {
  const { ctx } = mockCtx([{ body: [] }, { status: 201, body: {} }]);
  await assertRejects(() => subscribe({ owner: "o", repository: "r" }, ctx), Error, "no id");
});

test("onUnsubscribe: DELETEs the hook; 404 and 410 count as already gone", async () => {
  for (const status of [204, 404, 410]) {
    const { ctx, calls } = mockCtx([{ status }]);
    await push.onUnsubscribe!({ params: {}, state: STATE, subscriptionId: "sub_abc" }, ctx);
    assertEquals([calls[0].method, calls[0].url], [
      "DELETE",
      "https://api.github.com/repos/octocat/Hello-World/hooks/12345678",
    ]);
  }
  const { ctx } = mockCtx([{ status: 500 }]);
  await assertRejects(
    () => push.onUnsubscribe!({ params: {}, state: STATE, subscriptionId: "sub_abc" }, ctx),
    Error,
    "GitHub 500",
  );
});

test("onUnsubscribe: no recorded hook, no request", async () => {
  const { ctx, calls } = mockCtx();
  await push.onUnsubscribe!({ params: {}, state: {} as TriggerState, subscriptionId: "s" }, ctx);
  assertEquals(calls.length, 0);
});
