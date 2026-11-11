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

test("app: twelve webhook triggers plus the new-project poll, each with output and sample", () => {
  assertEquals(app.triggers.map((t) => t.key), [
    "push",
    "merge-request",
    "issue",
    "comment",
    "pipeline",
    "release",
    "tag-push",
    "job",
    "deployment",
    "wiki-page",
    "milestone",
    "new-project",
    "any-event",
  ]);
  for (const t of app.triggers) {
    assert(t.output!.length > 0, `${t.key} output`);
    assert(t.sample !== undefined, `${t.key} sample`);
    if (t.key === "new-project") {
      assertEquals(typeof (t as { poll?: unknown }).poll, "function");
      continue;
    }
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
  for (const drop of ["webhook-id", "webhook-timestamp"]) {
    const h: Record<string, string> = { ...headersFor() };
    delete h[drop];
    await assertRejects(() => ingest(push, call(BODY, h)), Error, "no signature");
  }
  // No signature header at all: refused in signed mode (the default).
  const h: Record<string, string> = { ...headersFor() };
  delete h["webhook-signature"];
  await assertRejects(() => ingest(push, call(BODY, h)), Error, "no signature");
});

const TOKEN_STATE: TriggerState = {
  hookId: "55",
  projectId: "gitlab-org/gitlab-test",
  kind: "push",
  mode: "token",
  legacyToken: "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90",
};

const LEGACY = { "x-gitlab-token": TOKEN, "x-gitlab-event": "Push Hook" };

test("R3-4 signed mode (and mode absent): unsigned + X-Gitlab-Token is refused, whatever its value", async () => {
  const signedState = { ...STATE, mode: "signed" as const };
  for (const state of [STATE, signedState]) {
    for (const given of [TOKEN, TOKEN_STATE.legacyToken!, "wrong", ""]) {
      await assertRejects(
        () => ingest(push, call(BODY, { "x-gitlab-token": given }), { state }),
        Error,
        "no signature",
      );
    }
    assertEquals(evs(await ingest(push, call(BODY, headersFor()), { state })).length, 1);
  }
});

test("R3-5 token mode: right token -> event; wrong, missing or empty-state token is refused", async () => {
  const state = TOKEN_STATE;
  const out = evs(
    await ingest(push, call(BODY, { "x-gitlab-token": state.legacyToken! }), { state }),
  );
  assertEquals(out.length, 1);
  assertEquals((out[0] as { deliveryId: unknown }).deliveryId, null);
  assertEquals(
    evs(await ingest(push, call(BODY, { "X-Gitlab-Token": state.legacyToken! }), { state })).length,
    1,
  );
  for (const given of ["wrong", "", state.legacyToken + "x", state.legacyToken!.slice(0, -1)]) {
    await assertRejects(
      () => ingest(push, call(BODY, { "x-gitlab-token": given }), { state }),
      Error,
      "no valid token",
    );
  }
  await assertRejects(() => ingest(push, call(BODY, {}), { state }), Error, "no valid token");
  // A signature is not consulted in token mode, and the signing-key-shaped value is no token.
  await assertRejects(
    () => ingest(push, call(BODY, headersFor()), { state }),
    Error,
    "no valid token",
  );
  for (const legacyToken of [undefined, ""]) {
    for (const headers of [{}, { "x-gitlab-token": "" }, { "x-gitlab-token": "undefined" }]) {
      await assertRejects(
        () => ingest(push, call(BODY, headers), { state: { ...state, legacyToken } }),
        Error,
        "secret",
      );
    }
  }
});

test("signed with a bad signature is refused even with a matching X-Gitlab-Token (no downgrade)", async () => {
  const bad = sign("msg_123", NOW, BODY, Buffer.from("fedcba9876543210fedcba9876543210"));
  await assertRejects(
    () => ingest(push, call(BODY, { ...headersFor(), "webhook-signature": bad, ...LEGACY })),
    Error,
    "signature does not match",
  );
  // An empty signature header still counts as signed: refused, never the token path.
  await assertRejects(
    () => ingest(push, call(BODY, { ...headersFor(), "webhook-signature": "", ...LEGACY })),
    Error,
    "no signature",
  );
  // Signature present but webhook-id / webhook-timestamp missing: refused despite the token.
  for (const drop of ["webhook-id", "webhook-timestamp"]) {
    const h: Record<string, string> = { ...headersFor(), ...LEGACY };
    delete h[drop];
    await assertRejects(() => ingest(push, call(BODY, h)), Error, "no signature");
  }
  // Non-empty signature header with no `v1,` entry: refused despite the token.
  for (const sig of ["v2,AAAA", "garbage", " "]) {
    await assertRejects(
      () => ingest(push, call(BODY, { ...headersFor(), "webhook-signature": sig, ...LEGACY })),
      Error,
    );
  }
  // A stale timestamp on a signed delivery is not rescued by the token either.
  await assertRejects(
    () => ingest(push, call(BODY, { ...headersFor(BODY, NOW - 9999), ...LEGACY })),
    Error,
    "5-minute window",
  );
  // Signed + valid, with a wrong token also present: the signature alone decides.
  const out = evs(await ingest(push, call(BODY, { ...headersFor(), "x-gitlab-token": "wrong" })));
  assertEquals(out.length, 1);
});

test("unset or empty stored secret refuses an unsigned delivery, even with an empty/absent token", async () => {
  for (const signingToken of [undefined, ""]) {
    for (const headers of [{}, { "x-gitlab-token": "" }, { "x-gitlab-token": "undefined" }]) {
      await assertRejects(
        () => ingest(push, call(BODY, headers), { state: { ...STATE, signingToken } }),
        Error,
        "secret",
      );
    }
  }
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
    () => ingest(push, call(BODY, { "x-gitlab-token": "leaky-token-value" })),
    () =>
      ingest(push, call(BODY, { "x-gitlab-token": "leaky-token-value" }), { state: TOKEN_STATE }),
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
    for (
      const leak of [
        TOKEN,
        KEY.toString("base64"),
        bad,
        "msg_123",
        String(NOW),
        "leaky-token-value",
        TOKEN_STATE.legacyToken!,
      ]
    ) {
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

const VERSION_URL = "https://gitlab.com/api/v4/version";
const HOOKS_URL = "https://gitlab.com/api/v4/projects/gitlab-org%2Fgitlab-test/hooks";

test("R3-1 onSubscribe on 19.1.0-ee: signing_token only, no token, mode signed", async () => {
  const { ctx, calls } = mockCtx([
    { body: { version: "19.1.0-ee", revision: "abc" } },
    { body: [{ id: 9, url: CALLBACK }, { id: 10, url: "https://elsewhere.test/hook" }] },
    { status: 204 },
    { status: 201, body: { id: 55 } },
  ]);
  const state = await subscribe({ projectId: "gitlab-org/gitlab-test" }, ctx);
  assertEquals(calls.length, 4);
  assertEquals([calls[0].method, calls[0].url], ["GET", VERSION_URL]);
  assertEquals([calls[1].method, calls[1].url], ["GET", `${HOOKS_URL}?per_page=100`]);
  assertEquals([calls[2].method, calls[2].url], ["DELETE", `${HOOKS_URL}/9`]);
  assertEquals([calls[3].method, calls[3].url], ["POST", HOOKS_URL]);
  // GitLab requires `whsec_<base64 of a 32-byte key>`.
  assert(/^whsec_[A-Za-z0-9+/]{43}=$/.test(state.signingToken!));
  assertEquals(Buffer.from(state.signingToken!.slice(6), "base64").length, 32);
  const body = JSON.parse(calls[3].body!);
  assertEquals(body, {
    url: CALLBACK,
    signing_token: state.signingToken,
    enable_ssl_verification: true,
    push_events: true,
  });
  assert(!("token" in body));
  assertEquals(state, {
    hookId: "55",
    projectId: "gitlab-org/gitlab-test",
    kind: "push",
    mode: "signed",
    signingToken: state.signingToken,
  });
});

test("R3-2 onSubscribe on 18.9.2: a new random token only, no signing_token, mode token", async () => {
  const { ctx, calls } = mockCtx([
    { body: { version: "18.9.2" } },
    { body: [] },
    { status: 201, body: { id: 56 } },
  ]);
  const state = await subscribe({ projectId: "gitlab-org/gitlab-test" }, ctx);
  assertEquals(calls[0].url, VERSION_URL);
  const body = JSON.parse(calls[2].body!);
  assert(!("signing_token" in body));
  assertEquals(typeof body.token, "string");
  assert(/^[0-9a-f]{64}$/.test(body.token));
  assertEquals(Object.keys(body).sort(), [
    "enable_ssl_verification",
    "push_events",
    "token",
    "url",
  ]);
  assertEquals(state, {
    hookId: "56",
    projectId: "gitlab-org/gitlab-test",
    kind: "push",
    mode: "token",
    legacyToken: body.token,
  });
  // No signing key exists in state, so the token cannot equal one.
  assertEquals(state.signingToken, undefined);
});

test("R3-3 onSubscribe: a failed or garbage /version is signed mode", async () => {
  const probes = [
    { status: 403, body: { message: "403 Forbidden" } },
    { status: 500 },
    { body: "<html>not json</html>" },
    { body: { version: "garbage" } },
    { body: {} },
    { body: { version: 19 } },
  ];
  for (const probe of probes) {
    const { ctx, calls } = mockCtx([probe, { body: [] }, { status: 201, body: { id: 57 } }]);
    const state = await subscribe({ projectId: "gitlab-org/gitlab-test" }, ctx);
    const body = JSON.parse(calls[2].body!);
    assert("signing_token" in body && !("token" in body), JSON.stringify(probe));
    assertEquals(state.mode, "signed");
    assertEquals(state.legacyToken, undefined);
  }
});

test("onSubscribe: the 19.0 boundary is signed; 18.x is token", async () => {
  for (
    const [version, mode] of [["19.0.0", "signed"], ["20.2.1-ee", "signed"], ["18.99.9", "token"], [
      "9.4.1",
      "token",
    ]]
  ) {
    const { ctx } = mockCtx([{ body: { version } }, { body: [] }, {
      status: 201,
      body: { id: 1 },
    }]);
    assertEquals((await subscribe({ projectId: "1" }, ctx)).mode, mode, version);
  }
});

test("onSubscribe: a non-push trigger turns push events off and its own flag on", async () => {
  const { ctx, calls } = mockCtx([
    { body: { version: "19.1.0" } },
    { body: [] },
    { status: 201, body: { id: 7 } },
  ]);
  await mergeRequest.onSubscribe!(
    { params: { projectId: "42" }, subscriptionId: "s", callbackUrl: CALLBACK, hostUrl: HOST },
    ctx,
  );
  assertEquals(calls[2].url, "https://gitlab.com/api/v4/projects/42/hooks");
  const body = JSON.parse(calls[2].body!);
  assertEquals([body.push_events, body.merge_requests_events], [false, true]);
});

test("onSubscribe: a fresh secret per subscription; project required", async () => {
  const make = (version: string) =>
    mockCtx([{ body: { version } }, { body: [] }, { status: 201, body: { id: 1 } }]).ctx;
  const a = await subscribe({ projectId: "1" }, make("19.0.0"));
  const b = await subscribe({ projectId: "1" }, make("19.0.0"));
  assert(a.signingToken !== b.signingToken);
  const c = await subscribe({ projectId: "1" }, make("18.0.0"));
  const d = await subscribe({ projectId: "1" }, make("18.0.0"));
  assert(c.legacyToken !== d.legacyToken);
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
