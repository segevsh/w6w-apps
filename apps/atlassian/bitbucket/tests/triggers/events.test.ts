import { test } from "node:test";
import { createHmac } from "node:crypto";
import type { TriggerCall } from "@w6w/types";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import anyEvent from "../../triggers/any-event.ts";
import issueUpdated from "../../triggers/issue-updated.ts";
import issueCommentCreated from "../../triggers/issue-comment-created.ts";
import pullRequestApproved from "../../triggers/pull-request-approved.ts";
import pullRequestChangesRequested from "../../triggers/pull-request-changes-requested.ts";
import repoFork from "../../triggers/repo-fork.ts";
import repoUpdated from "../../triggers/repo-updated.ts";
import commitStatusCreated from "../../triggers/commit-status-created.ts";
import commitStatusUpdated from "../../triggers/commit-status-updated.ts";

// Verbatim `values[].event` of GET https://api.bitbucket.org/2.0/hook_events/repository (2026-11-10).
const REGISTRY_REPOSITORY_EVENTS = [
  "repo:push",
  "repo:fork",
  "repo:updated",
  "repo:commit_comment_created",
  "repo:commit_status_created",
  "repo:commit_status_updated",
  "pullrequest:created",
  "pullrequest:push",
  "pullrequest:updated",
  "pullrequest:approved",
  "pullrequest:unapproved",
  "pullrequest:changes_request_created",
  "pullrequest:changes_request_removed",
  "pullrequest:fulfilled",
  "pullrequest:rejected",
  "pullrequest:comment_created",
  "pullrequest:comment_updated",
  "pullrequest:comment_deleted",
  "pullrequest:comment_resolved",
  "pullrequest:comment_reopened",
  "issue:created",
  "issue:updated",
  "issue:comment_created",
  "pipeline:span_created",
];
const SECRET = "test-secret";
const CALLBACK = "https://api.example.test/triggers/webhooks/sub_abc";
const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const sign = (body: string, secret = SECRET) =>
  "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
// Non-canonical whitespace: JSON.stringify(JSON.parse(BODY)) !== BODY.
const BODY =
  `{ "thing" : { "id": 1 },\n "repository":{"full_name":"teamsinspace/documentation-tests"},  "actor" : {"display_name":"Emma"} }`;

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
type Trigger = typeof anyEvent;
const ingest = (
  t: Trigger,
  raw: TriggerCall,
  params: Record<string, unknown> = {},
  state: unknown = { secret: SECRET },
) =>
  t.handleIngest!(
    { raw, params: params as never, state: state as never, subscriptionId: "sub_abc" },
    mockCtx().ctx,
  );
const headers = (event: string, body = BODY) => ({
  "x-event-key": event,
  "x-request-uuid": "req-1",
  "x-hub-signature": sign(body),
});
const subscribeParams = { workspace: "teamsinspace", repoSlug: "documentation-tests" };
const subscribe = (
  t: Trigger,
  params: Record<string, unknown>,
  ctx: ReturnType<typeof mockCtx>["ctx"],
) =>
  t.onSubscribe!({
    params: params as never,
    subscriptionId: "sub_abc",
    callbackUrl: CALLBACK,
    hostUrl: "",
  }, ctx);
const hooksBase =
  "https://api.bitbucket.org/2.0/repositories/teamsinspace/documentation-tests/hooks";
const subscribeMocks = () =>
  mockCtx([{ body: { values: [] } }, { status: 201, body: { uuid: "{b4f2a1c0-1111}" } }]);

const named: Array<[Trigger, string, string]> = [
  [issueUpdated as Trigger, "issue-updated", "issue:updated"],
  [issueCommentCreated as Trigger, "issue-comment-created", "issue:comment_created"],
  [pullRequestApproved as Trigger, "pull-request-approved", "pullrequest:approved"],
  [
    pullRequestChangesRequested as Trigger,
    "pull-request-changes-requested",
    "pullrequest:changes_request_created",
  ],
  [repoFork as Trigger, "repo-fork", "repo:fork"],
  [repoUpdated as Trigger, "repo-updated", "repo:updated"],
  [commitStatusCreated as Trigger, "commit-status-created", "repo:commit_status_created"],
  [commitStatusUpdated as Trigger, "commit-status-updated", "repo:commit_status_updated"],
];

assert(JSON.stringify(JSON.parse(BODY)) !== BODY);

for (const [t, key, event] of named) {
  test(`${key}: output, sample, hooks and its key`, () => {
    assertEquals(t.key, key);
    assert(t.output!.length > 0);
    assert(t.sample !== undefined);
    assertEquals(typeof t.onSubscribe, "function");
    assertEquals(typeof t.handleIngest, "function");
    assert(app.triggers.some((x) => x.key === key));
  });

  test(`${key}: valid signature over the raw body → one event named ${event}`, async () => {
    const out = evs(await ingest(t, call(BODY, headers(event)))) as Array<Record<string, unknown>>;
    assertEquals(out.length, 1);
    assertEquals(out[0].event, event);
    assertEquals(out[0].repository, "teamsinspace/documentation-tests");
    assertEquals(out[0].actor, "Emma");
  });

  test(`${key}: a flipped byte of the SIGNATURE itself, a flipped body byte, a missing header and an absent rawBody are refused`, async () => {
    const good = sign(BODY);
    const last = good.slice(-1);
    const bad = good.slice(0, -1) + (last === "0" ? "1" : "0");
    await assertRejects(
      () => ingest(t, call(BODY, { ...headers(event), "x-hub-signature": bad })),
      Error,
      "signature does not match",
    );
    await assertRejects(
      () => ingest(t, call(BODY.replace("Emma", "Emmb"), headers(event))),
      Error,
      "signature does not match",
    );
    const noSig: Record<string, string> = { ...headers(event) };
    delete noSig["x-hub-signature"];
    await assertRejects(() => ingest(t, call(BODY, noSig)), Error, "signature does not match");
    await assertRejects(() => ingest(t, call(undefined, headers(event))), Error, "raw body");
  });

  test(`${key}: an unset or empty secret refuses before any compare`, async () => {
    for (const state of [null, {}, { secret: "" }]) {
      await assertRejects(() => ingest(t, call(BODY, {}), {}, state), Error, "secret");
    }
  });

  test(`${key}: another verified event key is acknowledged without a run`, async () => {
    assertEquals(evs(await ingest(t, call(BODY, headers("repo:push")))), []);
  });

  test(`${key}: onSubscribe registers exactly ${event} (literal POST body)`, async () => {
    const { ctx, calls } = subscribeMocks();
    await subscribe(t, subscribeParams, ctx);
    assertEquals([calls[1].method, calls[1].url], ["POST", hooksBase]);
    assertEquals(JSON.parse(calls[1].body!).events, [event]);
  });
}

test("any-event: has workspace, repoSlug and events params and is wired", () => {
  assertEquals(anyEvent.params!.map((p) => p.key), ["workspace", "repoSlug", "events"]);
  assert(anyEvent.output!.length > 0 && anyEvent.sample !== undefined);
  assert(app.triggers.some((x) => x.key === "any-event"));
});

test("any-event: with no filter any signed event key is delivered under its own key", async () => {
  for (const event of ["repo:push", "pullrequest:comment_resolved", "issue:updated"]) {
    const out = evs(await ingest(anyEvent, call(BODY, headers(event)))) as Array<
      Record<string, unknown>
    >;
    assertEquals(out.length, 1);
    assertEquals(out[0].event, event);
  }
});

test("any-event: the events filter drops other keys; verification still comes first", async () => {
  const params = { events: " Repo:Push , issue:updated " };
  assertEquals(evs(await ingest(anyEvent, call(BODY, headers("repo:push")), params)).length, 1);
  assertEquals(evs(await ingest(anyEvent, call(BODY, headers("repo:fork")), params)), []);
  const good = sign(BODY);
  const bad = good.slice(0, -1) + (good.slice(-1) === "0" ? "1" : "0");
  await assertRejects(
    () => ingest(anyEvent, call(BODY, { ...headers("repo:fork"), "x-hub-signature": bad }), params),
    Error,
    "signature does not match",
  );
  await assertRejects(
    () => ingest(anyEvent, call(BODY, headers("repo:push")), params, null),
    Error,
    "secret",
  );
});

test("any-event: onSubscribe registers the chosen keys, or all 24 when empty; unknown keys fail first", async () => {
  const one = subscribeMocks();
  await subscribe(
    anyEvent,
    { ...subscribeParams, events: "repo:push, pullrequest:created" },
    one.ctx,
  );
  assertEquals(JSON.parse(one.calls[1].body!).events, ["repo:push", "pullrequest:created"]);
  const all = subscribeMocks();
  const state = await subscribe(anyEvent, subscribeParams, all.ctx) as { event: string };
  const events = JSON.parse(all.calls[1].body!).events as string[];
  assertEquals(events.length, 24);
  assert(events.includes("pullrequest:changes_request_removed"));
  assert(events.includes("pullrequest:push") && events.includes("pipeline:span_created"));
  assert(!events.includes("repo:deleted") && !events.includes("repo:transfer"));
  // Copy of GET /2.0/hook_events/repository (2026-11-10): the default must equal it exactly.
  assertEquals([...events].sort(), [...REGISTRY_REPOSITORY_EVENTS].sort());
  assertEquals(state.event, events.join(","));
  const bad = mockCtx();
  await assertRejects(
    () => subscribe(anyEvent, { ...subscribeParams, events: "repo:exploded" }, bad.ctx),
    Error,
    "Unknown Bitbucket event key",
  );
  assertEquals(bad.calls.length, 0);
});
