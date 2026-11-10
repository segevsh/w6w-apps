import { test } from "node:test";
import { createHmac } from "node:crypto";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import type { TriggerCall } from "@w6w/types";
import { mockCtx } from "../_helpers.ts";
import anyEvent from "../../triggers/any-event.ts";
import issueLabel from "../../triggers/issue-label.ts";
import user from "../../triggers/user.ts";
import type { TriggerState } from "../../lib/triggers.ts";

const CALLBACK = "https://api.example.test/triggers/webhooks/sub_abc";
const HOST = "https://api.example.test";
const SECRET = "test-secret";
const STATE: TriggerState = { webhookId: "wh-1", resourceType: "Issue,Reaction", secret: SECRET };

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);

const bodyAt = (tsMs: number, type = "Reaction", action = "create") =>
  `{ "action" : "${action}", "type":"${type}",  "actor": {"name":"Linear Orbit"},\n "data" : {"id":"r1","emoji":"tada"},\n "createdAt":"2026-11-10T10:00:00.000Z", "webhookTimestamp" : ${tsMs}, "webhookId":"wh_1" }`;
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
  raw: TriggerCall,
  opts: { state?: Partial<TriggerState>; params?: Record<string, unknown> } = {},
) {
  const state = "state" in opts ? opts.state : STATE;
  return anyEvent.handleIngest!(
    { raw, params: opts.params ?? {}, state: state as TriggerState, subscriptionId: "sub_abc" },
    mockCtx().ctx,
  );
}
const good = (body = BODY) => ({ "linear-signature": sign(body), "linear-delivery": "d-1" });

test("any-event: valid signature over a non-canonical body -> one event", async () => {
  assert(JSON.stringify(JSON.parse(BODY)) !== BODY);
  const out = evs(await ingest(call(BODY, good())));
  assertEquals(out.length, 1);
  assertEquals((out[0] as { resourceType: string }).resourceType, "Reaction");
  assertEquals((out[0] as { deliveryId: string }).deliveryId, "d-1");
});

test("any-event: flipped byte, missing header, missing rawBody, stale timestamp -> throw", async () => {
  await assertRejects(
    () => ingest(call(BODY.replace("tada", "tadb"), good(BODY))),
    Error,
    "signature does not match",
  );
  await assertRejects(() => ingest(call(BODY, {})), Error, "signature does not match");
  await assertRejects(() => ingest(call(undefined, good())), Error, "raw body");
  const stale = bodyAt(NOW - 120_000);
  await assertRejects(() => ingest(call(stale, good(stale))), Error, "60-second window");
});

test("any-event: unset or empty secret is refused first, even with the header absent", async () => {
  for (const state of [undefined, { ...STATE, secret: "" }]) {
    await assertRejects(() => ingest(call(BODY, {}), { state }), Error, "secret");
  }
});

test("any-event: events filter keeps only the named resource types", async () => {
  assertEquals(
    evs(await ingest(call(BODY, good()), { params: { events: "Issue, Reaction" } })).length,
    1,
  );
  assertEquals(evs(await ingest(call(BODY, good()), { params: { events: "Issue" } })), []);
});

test("any-event: actions filter applies", async () => {
  assertEquals(evs(await ingest(call(BODY, good()), { params: { actions: "remove" } })), []);
  assertEquals(evs(await ingest(call(BODY, good()), { params: { actions: "create" } })).length, 1);
});

const sub = (params: Record<string, unknown>, ctx: ReturnType<typeof mockCtx>["ctx"]) =>
  anyEvent.onSubscribe!(
    { params, subscriptionId: "sub_abc", callbackUrl: CALLBACK, hostUrl: HOST },
    ctx,
  ) as Promise<TriggerState>;
const gql = (body: string | null) =>
  JSON.parse(body!) as { query: string; variables: Record<string, unknown> };

test("any-event onSubscribe: blank events registers the documented six types", async () => {
  const { ctx, calls } = mockCtx([
    { body: { data: { webhooks: { nodes: [] } } } },
    { body: { data: { webhookCreate: { success: true, webhook: { id: "w" } } } } },
  ]);
  const state = await sub({}, ctx);
  assertEquals(gql(calls[1].body).variables.input, {
    url: CALLBACK,
    label: "w6w trigger",
    resourceTypes: ["Comment", "Issue", "IssueLabel", "Project", "Cycle", "Reaction"],
    secret: state.secret,
    enabled: true,
    allPublicTeams: true,
  });
  assert(/^[0-9a-f]{64}$/.test(state.secret));
});

test("any-event onSubscribe: named events become the subscription list", async () => {
  const { ctx, calls } = mockCtx([
    { body: { data: { webhooks: { nodes: [] } } } },
    { body: { data: { webhookCreate: { success: true, webhook: { id: "w" } } } } },
  ]);
  const state = await sub({ events: "Issue, Document", teamId: "t1" }, ctx);
  assertEquals((gql(calls[1].body).variables.input as { resourceTypes: string[] }).resourceTypes, [
    "Issue",
    "Document",
  ]);
  assertEquals(state.resourceType, "Issue,Document");
});

test("any-event onUnsubscribe: webhookDelete by id", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { webhookDelete: { success: true } } } }]);
  await anyEvent.onUnsubscribe!({ params: {}, state: STATE, subscriptionId: "s" }, ctx);
  assertEquals(gql(calls[0].body).variables, { id: "wh-1" });
});

test("issue-label: only IssueLabel deliveries emit; registers IssueLabel", async () => {
  const body = bodyAt(Date.now(), "IssueLabel", "update");
  const st = { ...STATE, resourceType: "IssueLabel" };
  const run = (b: string) =>
    issueLabel.handleIngest!(
      { raw: call(b, good(b)), params: {}, state: st, subscriptionId: "s" },
      mockCtx().ctx,
    );
  assertEquals(evs(await run(body)).length, 1);
  assertEquals(evs(await run(BODY)), []);
  const { ctx, calls } = mockCtx([
    { body: { data: { webhooks: { nodes: [] } } } },
    { body: { data: { webhookCreate: { success: true, webhook: { id: "w" } } } } },
  ]);
  await issueLabel.onSubscribe!(
    { params: {}, subscriptionId: "s", callbackUrl: CALLBACK, hostUrl: HOST },
    ctx,
  );
  assertEquals((gql(calls[1].body).variables.input as { resourceTypes: string[] }).resourceTypes, [
    "IssueLabel",
  ]);
});

const rawBody = (o: Record<string, unknown>) =>
  JSON.stringify({ ...o, webhookTimestamp: Date.now() });

test("any-event: the whole body rides along as payload (IssueSLA, OAuthApp)", async () => {
  for (
    const o of [
      { action: "set", type: "IssueSLA", issueData: { id: "i1", title: "T" } },
      { action: "revoked", type: "OAuthApp", oauthClientId: "client-1", organizationId: "org-1" },
    ]
  ) {
    const b = rawBody(o);
    const out = evs(await ingest(call(b, good(b))));
    assertEquals(out.length, 1);
    const e = out[0] as { resourceType: string; payload: Record<string, unknown> };
    assertEquals(e.resourceType, o.type);
    assertEquals(e.payload, JSON.parse(b));
  }
});

const TRIGGERS: Record<string, { t: typeof anyEvent; type: string }> = {
  "any-event": { t: anyEvent, type: "Reaction" },
  "issue-label": { t: issueLabel as never, type: "IssueLabel" },
  "user": { t: user as never, type: "User" },
};

for (const name of Object.keys(TRIGGERS)) {
  test(`${name}: signature failures and a flipped signature character throw`, async () => {
    const { t, type } = TRIGGERS[name];
    const st = { ...STATE, resourceType: type };
    const go = (raw: TriggerCall, ...rest: [Partial<TriggerState> | undefined?]) =>
      t.handleIngest!(
        {
          raw,
          params: {},
          state: (rest.length > 0 ? rest[0] : st) as TriggerState,
          subscriptionId: "s",
        },
        mockCtx().ctx,
      );
    const b = bodyAt(Date.now(), type, "update");
    const sig = sign(b);
    const flipped = sig.slice(0, -1) + (sig.endsWith("0") ? "1" : "0");
    await assertRejects(
      () => go(call(b, { "linear-signature": flipped })),
      Error,
      "signature does not match",
    );
    await assertRejects(
      () => go(call(b.replace("tada", "tadb"), { "linear-signature": sig })),
      Error,
      "signature does not match",
    );
    await assertRejects(() => go(call(b, {})), Error, "signature does not match");
    await assertRejects(() => go(call(undefined, { "linear-signature": sig })), Error, "raw body");
    const stale = bodyAt(NOW - 120_000, type, "update");
    await assertRejects(() => go(call(stale, good(stale))), Error, "60-second window");
    for (const state of [undefined, { ...st, secret: "" }]) {
      await assertRejects(() => go(call(b, {}), state), Error, "secret");
    }
  });
}

test("user: only User deliveries emit; registers User", async () => {
  const body = bodyAt(Date.now(), "User", "update");
  const st = { ...STATE, resourceType: "User" };
  const run = (b: string) =>
    user.handleIngest!(
      { raw: call(b, good(b)), params: {}, state: st, subscriptionId: "s" },
      mockCtx().ctx,
    );
  const out = evs(await run(body));
  assertEquals(out.length, 1);
  assertEquals((out[0] as { resourceType: string }).resourceType, "User");
  assertEquals(evs(await run(BODY)), []);
  const { ctx, calls } = mockCtx([
    { body: { data: { webhooks: { nodes: [] } } } },
    { body: { data: { webhookCreate: { success: true, webhook: { id: "w" } } } } },
  ]);
  await user.onSubscribe!(
    { params: {}, subscriptionId: "s", callbackUrl: CALLBACK, hostUrl: HOST },
    ctx,
  );
  assertEquals((gql(calls[1].body).variables.input as { resourceTypes: string[] }).resourceTypes, [
    "User",
  ]);
});
