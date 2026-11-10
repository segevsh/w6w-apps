import { test } from "node:test";
import { createHmac } from "node:crypto";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import type { TriggerCall } from "@w6w/types";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import { parseKinds } from "../../lib/triggers.ts";

/**
 * The webhook triggers added in round 3: one GitLab `object_kind` each, plus the any-event
 * trigger. Signed mode (GitLab 19.0+): `webhook-signature` is `v1,` + base64 HMAC-SHA256 of
 * `<webhook-id>.<webhook-timestamp>.<raw body>` under the decoded `whsec_` key, inside a 5 minute
 * window. The expected signature is computed by node:crypto; the body is non-canonical JSON.
 */

const CALLBACK = "https://api.example.test/triggers/webhooks/sub_abc";
const KEY = Buffer.from("test-key-0123456789abcdef0123456"); // 32 bytes
const TOKEN = `whsec_${KEY.toString("base64")}`;
const VERSION_URL = "https://gitlab.com/api/v4/version";
const HOOKS_URL = "https://gitlab.com/api/v4/projects/gitlab-org%2Fgitlab-test/hooks";
const NOW = () => Math.floor(Date.now() / 1000);

/** [trigger key, object_kind, the project-hook flag it switches on, has the `actions` filter]. */
const CASES: Array<[string, string, string, boolean]> = [
  ["tag-push", "tag_push", "tag_push_events", false],
  ["job", "build", "job_events", false],
  ["deployment", "deployment", "deployment_events", false],
  ["wiki-page", "wiki_page", "wiki_page_events", true],
  ["milestone", "milestone", "milestone_events", true],
];

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const sign = (id: string, ts: string | number, body: string, key: Buffer = KEY) =>
  "v1," + createHmac("sha256", key).update(`${id}.${ts}.${body}`).digest("base64");

/** Non-canonical whitespace: `JSON.stringify(JSON.parse(body)) !== body`. */
const bodyFor = (kind: string) =>
  `{ "object_kind" : "${kind}",\n "action":"create",  "user_username": "jsmith", "object_attributes" : {"action":"create"},\n "project" : {"path_with_namespace":"gitlab-org/gitlab-test"} }`;

function headersFor(body: string, ts: string | number = NOW(), id = "msg_123") {
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

const trigger = (key: string) => {
  const t = (app.triggers ?? []).find((x) => x.key === key);
  assert(t !== undefined, key);
  return t;
};

function ingest(
  key: string,
  raw: TriggerCall,
  state: Record<string, unknown> | undefined,
  params: Record<string, unknown> = {},
) {
  return trigger(key).handleIngest!(
    { raw, params, state: state as never, subscriptionId: "s" },
    mockCtx().ctx,
  );
}

const stateFor = (kind: string, extra: Record<string, unknown> = {}) => ({
  hookId: "55",
  projectId: "gitlab-org/gitlab-test",
  kind,
  mode: "signed",
  signingToken: TOKEN,
  ...extra,
});

for (const [key, kind, flag, hasActions] of CASES) {
  const state = stateFor(kind);
  const body = bodyFor(kind);

  test(`${key}: declared with output, a sample and the webhook lifecycle`, () => {
    const t = trigger(key);
    assert(t.output!.length > 0);
    assert(t.sample !== undefined);
    assertEquals(typeof t.onSubscribe, "function");
    assertEquals(typeof t.onUnsubscribe, "function");
    assertEquals(typeof (t as { poll?: unknown }).poll, "undefined");
    assertEquals(
      t.params!.map((p) => p.key),
      hasActions ? ["projectId", "actions"] : ["projectId"],
    );
    assert(JSON.stringify(JSON.parse(body)) !== body);
  });

  test(`${key}: registers one hook with only ${flag} on (literal request)`, async () => {
    const { ctx, calls } = mockCtx([
      { body: { version: "19.1.0-ee" } },
      { body: [] },
      { status: 201, body: { id: 55 } },
    ]);
    const out = await trigger(key).onSubscribe!(
      { params: { projectId: "gitlab-org/gitlab-test" }, callbackUrl: CALLBACK },
      ctx,
    ) as { signingToken: string };
    assertEquals([calls[0].method, calls[0].url], ["GET", VERSION_URL]);
    assertEquals([calls[2].method, calls[2].url], ["POST", HOOKS_URL]);
    assertEquals(JSON.parse(calls[2].body!), {
      url: CALLBACK,
      signing_token: out.signingToken,
      enable_ssl_verification: true,
      push_events: false,
      [flag]: true,
    });
    assertEquals(out, {
      hookId: "55",
      projectId: "gitlab-org/gitlab-test",
      kind,
      mode: "signed",
      signingToken: out.signingToken,
    });
  });

  test(`${key}: a valid signature over the exact bytes yields the event`, async () => {
    const out = evs(await ingest(key, call(body, headersFor(body)), state));
    assertEquals(out.length, 1);
    assertEquals((out[0] as { kind: string }).kind, kind);
    assertEquals((out[0] as { project: string }).project, "gitlab-org/gitlab-test");
    assertEquals((out[0] as { user: string }).user, "jsmith");
    assertEquals((out[0] as { deliveryId: string }).deliveryId, "msg_123");
  });

  test(`${key}: a flipped byte, a missing header and an absent rawBody are refused`, async () => {
    const tampered = body.replace("jsmith", "jsmitt");
    await assertRejects(
      async () => await ingest(key, call(tampered, headersFor(body)), state),
      Error,
      "signature",
    );
    const good = headersFor(body);
    const sig = good["webhook-signature"];
    const flipped = sig.slice(0, -2) + (sig.slice(-2, -1) === "A" ? "B" : "A") + sig.slice(-1);
    await assertRejects(
      async () => await ingest(key, call(body, { ...good, "webhook-signature": flipped }), state),
      Error,
      "signature",
    );
    for (const missing of ["webhook-id", "webhook-timestamp", "webhook-signature"]) {
      const h: Record<string, string> = { ...good };
      delete h[missing];
      await assertRejects(async () => await ingest(key, call(body, h), state), Error, "signature");
    }
    await assertRejects(
      async () => await ingest(key, call(undefined, good), state),
      Error,
      "raw body",
    );
    const canonical = JSON.stringify(JSON.parse(body));
    await assertRejects(
      async () =>
        await ingest(
          key,
          call(body, {
            ...good,
            "webhook-signature": sign("msg_123", good["webhook-timestamp"], canonical),
          }),
          state,
        ),
      Error,
      "signature",
    );
  });

  test(`${key}: a stale or future timestamp is refused even with a correct signature`, async () => {
    for (const ts of [NOW() - 400, NOW() + 400]) {
      await assertRejects(
        async () => await ingest(key, call(body, headersFor(body, ts)), state),
        Error,
        "timestamp",
      );
    }
  });

  test(`${key}: an unset or empty signing token is refused first, signature or not`, async () => {
    for (const signingToken of [undefined, ""]) {
      await assertRejects(
        async () => await ingest(key, call(body, {}), { ...state, signingToken }),
        Error,
        "secret",
      );
      await assertRejects(
        async () => await ingest(key, call(body, headersFor(body)), { ...state, signingToken }),
        Error,
        "secret",
      );
    }
  });

  test(`${key}: a verified delivery of another kind yields none`, async () => {
    const other = bodyFor("pipeline");
    assertEquals(evs(await ingest(key, call(other, headersFor(other)), state)), []);
  });

  if (hasActions) {
    test(`${key}: the actions filter keeps only the named actions`, async () => {
      const raw = call(body, headersFor(body));
      assertEquals(evs(await ingest(key, raw, state, { actions: "create" })).length, 1);
      assertEquals(evs(await ingest(key, raw, state, { actions: " delete , update" })), []);
      assertEquals(evs(await ingest(key, raw, state, { actions: "" })).length, 1);
    });
  }
}

// ── any-event ───────────────────────────────────────────────────────────────

test("any-event: projectId and events params; no actions filter", () => {
  const t = trigger("any-event");
  assertEquals(t.params!.map((p) => p.key), ["projectId", "events"]);
  assert(t.output!.length > 0);
  assertEquals((t.sample as { kind: string }).kind, "emoji");
  assertEquals((t.sample as { action: string }).action, "award");
});

test("parseKinds: blank means every kind with a hook flag; names are validated", () => {
  const all = parseKinds(undefined);
  assertEquals(all.length, 15);
  assert(all.includes("build") && all.includes("tag_push") && all.includes("push"));
  assertEquals(parseKinds(" "), all);
  assertEquals(parseKinds("build, push , build"), ["build", "push"]);
  for (const bad of ["vulnerability", "member", "Build", "toString", "__proto__"]) {
    let message = "no throw";
    try {
      parseKinds(bad);
    } catch (e) {
      message = (e as Error).message;
    }
    assert(message.includes("is not a GitLab webhook kind"), bad);
  }
});

test("any-event: a list switches on exactly those flags; issue and note add their confidential flag", async () => {
  const { ctx, calls } = mockCtx([
    { body: { version: "19.0.0" } },
    { body: [] },
    { status: 201, body: { id: 56 } },
  ]);
  const out = await trigger("any-event").onSubscribe!(
    {
      params: { projectId: "gitlab-org/gitlab-test", events: "build, issue" },
      callbackUrl: CALLBACK,
    },
    ctx,
  ) as { signingToken: string };
  assertEquals(calls[2].url, HOOKS_URL);
  assertEquals(JSON.parse(calls[2].body!), {
    url: CALLBACK,
    signing_token: out.signingToken,
    enable_ssl_verification: true,
    push_events: false,
    job_events: true,
    issues_events: true,
    confidential_issues_events: true,
  });
  assertEquals(out, {
    hookId: "56",
    projectId: "gitlab-org/gitlab-test",
    kind: "any",
    kinds: ["build", "issue"],
    mode: "signed",
    signingToken: out.signingToken,
  });
});

test("any-event: a blank list switches on every flag; an unknown kind registers nothing", async () => {
  const { ctx, calls } = mockCtx([
    { body: { version: "19.0.0" } },
    { body: [] },
    { status: 201, body: { id: 57 } },
  ]);
  await trigger("any-event").onSubscribe!(
    { params: { projectId: "gitlab-org/gitlab-test" }, callbackUrl: CALLBACK },
    ctx,
  );
  const body = JSON.parse(calls[2].body!);
  for (
    const flag of [
      "push_events",
      "tag_push_events",
      "issues_events",
      "confidential_issues_events",
      "note_events",
      "confidential_note_events",
      "merge_requests_events",
      "wiki_page_events",
      "pipeline_events",
      "job_events",
      "deployment_events",
      "releases_events",
      "milestone_events",
      "feature_flag_events",
      "emoji_events",
      "resource_access_token_events",
      "resource_deploy_token_events",
    ]
  ) assertEquals(body[flag], true, flag);
  const none = mockCtx([]);
  await assertRejects(
    async () =>
      await trigger("any-event").onSubscribe!(
        { params: { projectId: "p", events: "vulnerability" }, callbackUrl: CALLBACK },
        none.ctx,
      ),
    Error,
    "is not a GitLab webhook kind",
  );
  assertEquals(none.calls.length, 0);
});

test("any-event: the stored kinds filter (verified first); a signed delivery of a listed kind passes", async () => {
  const some = stateFor("any", { kinds: ["build", "emoji"] });
  const emoji = bodyFor("emoji");
  const out = evs(await ingest("any-event", call(emoji, headersFor(emoji)), some));
  assertEquals(out.length, 1);
  assertEquals((out[0] as { kind: string }).kind, "emoji");
  assertEquals((out[0] as { action: string }).action, "create");
  const push = bodyFor("push");
  assertEquals(evs(await ingest("any-event", call(push, headersFor(push)), some)), []);
  // no stored kinds at all: nothing passes
  assertEquals(
    evs(await ingest("any-event", call(emoji, headersFor(emoji)), stateFor("any"))),
    [],
  );
});

test("any-event: signature failures are refused before the kind filter", async () => {
  const some = stateFor("any", { kinds: ["build"] });
  const body = bodyFor("build");
  await assertRejects(
    async () =>
      await ingest("any-event", call(body.replace("jsmith", "x"), headersFor(body)), some),
    Error,
    "signature",
  );
  await assertRejects(
    async () => await ingest("any-event", call(body, {}), some),
    Error,
    "signature",
  );
  await assertRejects(
    async () => await ingest("any-event", call(undefined, headersFor(body)), some),
    Error,
    "raw body",
  );
  await assertRejects(
    async () => await ingest("any-event", call(body, headersFor(body, NOW() - 400)), some),
    Error,
    "timestamp",
  );
  for (const signingToken of [undefined, ""]) {
    await assertRejects(
      async () =>
        await ingest("any-event", call(body, headersFor(body)), { ...some, signingToken }),
      Error,
      "secret",
    );
  }
});

test("any-event: token mode (a server before 19.0) still gates on X-Gitlab-Token and the kind list", async () => {
  const state = {
    hookId: "58",
    projectId: "gitlab-org/gitlab-test",
    kind: "any",
    kinds: ["build"],
    mode: "token",
    legacyToken: "test-legacy-token",
  };
  const body = bodyFor("build");
  assertEquals(
    evs(await ingest("any-event", call(body, { "x-gitlab-token": "test-legacy-token" }), state))
      .length,
    1,
  );
  await assertRejects(
    async () => await ingest("any-event", call(body, { "x-gitlab-token": "wrong" }), state),
    Error,
    "token",
  );
  await assertRejects(
    async () =>
      await ingest("any-event", call(body, { "x-gitlab-token": "x" }), {
        ...state,
        legacyToken: "",
      }),
    Error,
    "secret",
  );
  const push = bodyFor("push");
  assertEquals(
    evs(await ingest("any-event", call(push, { "x-gitlab-token": "test-legacy-token" }), state)),
    [],
  );
});
