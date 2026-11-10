import { test } from "node:test";
import { createHmac } from "node:crypto";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import type { HookContext, TriggerCall } from "@w6w/types";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import push from "../../triggers/push.ts";
import mergeRequest from "../../triggers/merge-request.ts";
import type { TriggerState } from "../../lib/triggers.ts";

const CALLBACK = "https://api.example.test/triggers/webhooks/sub_abc";
const HOST = "https://api.example.test";
const KEY = Buffer.from("0123456789abcdef0123456789abcdef"); // 32 bytes
const TOKEN = `whsec_${KEY.toString("base64")}`;
const STATE: TriggerState = {
  hookId: "55",
  projectId: "gitlab-org/gitlab-test",
  kind: "push",
  signingToken: TOKEN,
};

/** Narrow the `E[] | { events, response? }` union (brief §3) before indexing. */
const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);

/** Non-canonical whitespace: `JSON.stringify(JSON.parse(BODY)) !== BODY`. */
const BODY =
  `{ "object_kind" : "push",\n "ref":"refs/heads/main",  "user_username": "jsmith", "commits": [ {"id":"da1560"} ],\n "project" : {"path_with_namespace":"gitlab-org/gitlab-test"} }`;
const NOW = Math.floor(Date.now() / 1000);

const sign = (id: string, ts: string | number, body: string, key: Buffer = KEY) =>
  "v1," + createHmac("sha256", key).update(`${id}.${ts}.${body}`).digest("base64");

function headersFor(body = BODY, ts: string | number = NOW, id = "msg_123") {
  return {
    "webhook-id": id,
    "webhook-timestamp": String(ts),
    "webhook-signature": sign(id, ts, body),
  };
}

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
  const state = "state" in opts ? opts.state : STATE;
  return trigger.handleIngest!(
    { raw, params: opts.params ?? {}, state: state as TriggerState, subscriptionId: "sub_abc" },
    mockCtx().ctx,
  );
}

test("app: six webhook triggers, each with output and sample", () => {
  assertEquals(app.triggers.map((t) => t.key), [
    "push",
    "merge-request",
    "issue",
    "comment",
    "pipeline",
    "release",
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
  const out = evs(await ingest(push, call(BODY, headersFor())));
  assertEquals(out, [{
    kind: "push",
    action: null,
    deliveryId: "msg_123",
    project: "gitlab-org/gitlab-test",
    user: "jsmith",
    payload: JSON.parse(BODY),
  }]);
});

test("a signature among several space-separated ones is accepted", async () => {
  const h = headersFor();
  const out = evs(
    await ingest(
      push,
      call(BODY, { ...h, "webhook-signature": `v1,AAAA ${h["webhook-signature"]}` }),
    ),
  );
  assertEquals(out.length, 1);
});

test("a signature computed over the re-serialised body is refused", async () => {
  const resigned = sign("msg_123", NOW, JSON.stringify(JSON.parse(BODY)));
  await assertRejects(
    () => ingest(push, call(BODY, { ...headersFor(), "webhook-signature": resigned })),
    Error,
    "signature does not match",
  );
});

test("one flipped byte in the body is refused", async () => {
  await assertRejects(
    () => ingest(push, call(BODY.replace("da1560", "da1561"), headersFor(BODY))),
    Error,
    "signature does not match",
  );
});

test("a changed webhook-id or timestamp (not covered by the header) is refused", async () => {
  const h = headersFor();
  await assertRejects(
    () => ingest(push, call(BODY, { ...h, "webhook-id": "msg_other" })),
    Error,
    "signature does not match",
  );
  await assertRejects(
    () => ingest(push, call(BODY, { ...h, "webhook-timestamp": String(NOW + 1) })),
    Error,
    "signature does not match",
  );
});

test("a signature made with another key is refused", async () => {
  const other = sign("msg_123", NOW, BODY, Buffer.from("fedcba9876543210fedcba9876543210"));
  await assertRejects(
    () => ingest(push, call(BODY, { ...headersFor(), "webhook-signature": other })),
    Error,
    "signature does not match",
  );
});

test("each signature header missing is refused", async () => {
  for (const drop of ["webhook-id", "webhook-timestamp", "webhook-signature"]) {
    const h: Record<string, string> = { ...headersFor() };
    delete h[drop];
    await assertRejects(() => ingest(push, call(BODY, h)), Error, "no signature");
  }
});

test("a delivery signed only with the plain X-Gitlab-Token is refused (no unsigned path)", async () => {
  await assertRejects(
    () => ingest(push, call(BODY, { "x-gitlab-token": TOKEN, "x-gitlab-event": "Push Hook" })),
    Error,
    "no signature",
  );
});

test("a stale or future timestamp is refused, even with a valid signature over it", async () => {
  for (const ts of [NOW - 301 - 5, NOW + 301 + 5]) {
    await assertRejects(
      () => ingest(push, call(BODY, headersFor(BODY, ts))),
      Error,
      "5-minute window",
    );
  }
  assertEquals(evs(await ingest(push, call(BODY, headersFor(BODY, NOW - 200)))).length, 1);
});

test("a non-numeric timestamp is refused", async () => {
  await assertRejects(
    () => ingest(push, call(BODY, headersFor(BODY, "yesterday"))),
    Error,
    "5-minute window",
  );
});

test("rawBody absent is refused", async () => {
  await assertRejects(() => ingest(push, call(undefined, headersFor())), Error, "raw body");
});

test("unset, empty or malformed stored token is refused, even with headers absent", async () => {
  for (const signingToken of [undefined, ""]) {
    for (const headers of [{}, headersFor()]) {
      await assertRejects(
        () => ingest(push, call(BODY, headers), { state: { ...STATE, signingToken } }),
        Error,
        "secret",
      );
    }
  }
  await assertRejects(() => ingest(push, call(BODY, {}), { state: undefined }), Error, "secret");
  for (const signingToken of ["not-a-token", "whsec_", "whsec_!!!"]) {
    await assertRejects(
      () => ingest(push, call(BODY, headersFor()), { state: { ...STATE, signingToken } }),
      Error,
      "unusable",
    );
  }
});

test("a non-POST call is refused", async () => {
  await assertRejects(
    () => ingest(push, { ...call(BODY, headersFor()), method: "GET" }),
    Error,
    "POST",
  );
});

test("error text never echoes the token, a signature or a header value", async () => {
  const bad = sign("msg_123", NOW, BODY, Buffer.from("fedcba9876543210fedcba9876543210"));
  const cases: Array<() => Promise<unknown>> = [
    () => ingest(push, call(BODY, { ...headersFor(), "webhook-signature": bad })),
    () => ingest(push, call(undefined, headersFor())),
    () => ingest(push, call(BODY, headersFor(BODY, NOW - 9999))),
    () => ingest(push, call(BODY, headersFor()), { state: { ...STATE, signingToken: "" } }),
    () =>
      ingest(push, call(BODY, headersFor()), { state: { ...STATE, signingToken: "whsec_!!!" } }),
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
    for (const leak of [TOKEN, KEY.toString("base64"), bad, "msg_123", String(NOW)]) {
      assert(!m.includes(leak), `leaked ${leak}`);
    }
  }
});

test("an event kind the trigger did not ask for yields no event (verified first)", async () => {
  const body = `{ "object_kind" : "issue", "object_attributes": {"action":"open"} }`;
  assertEquals(evs(await ingest(push, call(body, headersFor(body)))), []);
});

test("actions filter reads object_attributes.action", async () => {
  const body =
    `{ "object_kind" : "merge_request", "user": {"username":"jsmith"}, "object_attributes": { "action" : "merge", "iid": 3 } }`;
  const raw = call(body, headersFor(body));
  const kept = evs(await ingest(mergeRequest, raw, { params: { actions: "open, merge" } }));
  assertEquals(kept.length, 1);
  assertEquals((kept[0] as { action: string; user: string }).action, "merge");
  assertEquals(evs(await ingest(mergeRequest, raw, { params: { actions: "open" } })), []);
  assertEquals(evs(await ingest(mergeRequest, raw)).length, 1);
});

// ── onSubscribe / onUnsubscribe ─────────────────────────────────────────────

function subscribe(params: Record<string, unknown>, ctx: HookContext) {
  return push.onSubscribe!(
    { params, subscriptionId: "sub_abc", callbackUrl: CALLBACK, hostUrl: HOST },
    ctx,
  ) as Promise<TriggerState>;
}

test("onSubscribe: deletes a leftover hook, creates one with a signing token, stores it", async () => {
  const { ctx, calls } = mockCtx([
    { body: [{ id: 9, url: CALLBACK }, { id: 10, url: "https://elsewhere.test/hook" }] },
    { status: 204 },
    { status: 201, body: { id: 55 } },
  ]);
  const state = await subscribe({ projectId: "gitlab-org/gitlab-test" }, ctx);
  assertEquals(calls.length, 3);
  assertEquals([calls[0].method, calls[0].url], [
    "GET",
    "https://gitlab.com/api/v4/projects/gitlab-org%2Fgitlab-test/hooks?per_page=100",
  ]);
  assertEquals([calls[1].method, calls[1].url], [
    "DELETE",
    "https://gitlab.com/api/v4/projects/gitlab-org%2Fgitlab-test/hooks/9",
  ]);
  assertEquals([calls[2].method, calls[2].url], [
    "POST",
    "https://gitlab.com/api/v4/projects/gitlab-org%2Fgitlab-test/hooks",
  ]);
  // GitLab requires `whsec_<base64 of a 32-byte key>`.
  assert(/^whsec_[A-Za-z0-9+/]{43}=$/.test(state.signingToken));
  assertEquals(Buffer.from(state.signingToken.slice(6), "base64").length, 32);
  assertEquals(JSON.parse(calls[2].body!), {
    url: CALLBACK,
    signing_token: state.signingToken,
    enable_ssl_verification: true,
    push_events: true,
  });
  assertEquals(state, {
    hookId: "55",
    projectId: "gitlab-org/gitlab-test",
    kind: "push",
    signingToken: state.signingToken,
  });
});

test("onSubscribe: a non-push trigger turns push events off and its own flag on", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }, { status: 201, body: { id: 7 } }]);
  await mergeRequest.onSubscribe!(
    { params: { projectId: "42" }, subscriptionId: "s", callbackUrl: CALLBACK, hostUrl: HOST },
    ctx,
  );
  assertEquals(calls[1].url, "https://gitlab.com/api/v4/projects/42/hooks");
  const body = JSON.parse(calls[1].body!);
  assertEquals([body.push_events, body.merge_requests_events], [false, true]);
});

test("onSubscribe: a fresh token per subscription; project required", async () => {
  const make = () => mockCtx([{ body: [] }, { status: 201, body: { id: 1 } }]).ctx;
  const a = await subscribe({ projectId: "1" }, make());
  const b = await subscribe({ projectId: "1" }, make());
  assert(a.signingToken !== b.signingToken);
  const { ctx, calls } = mockCtx();
  await assertRejects(() => subscribe({}, ctx), Error, "Project");
  assertEquals(calls.length, 0);
});

test("onUnsubscribe: DELETEs the hook; 404 and 410 count as already gone", async () => {
  for (const status of [204, 404, 410]) {
    const { ctx, calls } = mockCtx([{ status }]);
    await push.onUnsubscribe!({ params: {}, state: STATE, subscriptionId: "sub_abc" }, ctx);
    assertEquals([calls[0].method, calls[0].url], [
      "DELETE",
      "https://gitlab.com/api/v4/projects/gitlab-org%2Fgitlab-test/hooks/55",
    ]);
  }
  const { ctx } = mockCtx([{ status: 500 }]);
  await assertRejects(
    () => push.onUnsubscribe!({ params: {}, state: STATE, subscriptionId: "sub_abc" }, ctx),
    Error,
    "GitLab 500",
  );
});

test("onUnsubscribe: no recorded hook, no request", async () => {
  const { ctx, calls } = mockCtx();
  await push.onUnsubscribe!({ params: {}, state: {} as TriggerState, subscriptionId: "s" }, ctx);
  assertEquals(calls.length, 0);
});
