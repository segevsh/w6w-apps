import { test } from "node:test";
import { createHmac } from "node:crypto";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import runCreated from "../../triggers/run-created.ts";
import runApplying from "../../triggers/run-applying.ts";
import runCanceled from "../../triggers/run-canceled.ts";
import runPending from "../../triggers/run-pending-apply-approval.ts";
import workspaceDeleted from "../../triggers/workspace-deleted.ts";
import driftDetected from "../../triggers/drift-detected.ts";
import anyEvent from "../../triggers/any-event.ts";
import newOrganization from "../../triggers/new-organization.ts";
import newWorkspace from "../../triggers/new-workspace.ts";
import newVariable from "../../triggers/new-variable.ts";

async function rejects(fn: () => PromiseLike<unknown> | unknown): Promise<Error> {
  try {
    await fn();
  } catch (err) {
    assert(err instanceof Error, "rejected with a non-Error");
    return err;
  }
  throw new Error("Expected the call to reject.");
}

const evs = (r: unknown) =>
  (Array.isArray(r) ? r : (r as { events: unknown[] }).events) as Array<Record<string, unknown>>;
const TOKEN = "notification-token-for-tests-0123456789";
const CALLBACK = "https://api.example.test/triggers/webhooks/sub_2";
const STATE = {
  workspaceId: "ws-XdeUVMWShTesDMME",
  notificationConfigurationId: "nc-1",
  token: TOKEN,
};
const sign = (body: string, key = TOKEN) => createHmac("sha512", key).update(body).digest("hex");

const runBody = (trigger: string, status = "applied") =>
  `{ "payload_version" : 1,  "notification_configuration_id":"nc-1",
  "run_url":"https://app.terraform.io/app/acme/ws/runs/run-1", "run_id" : "run-1",
  "workspace_id":"ws-XdeUVMWShTesDMME", "workspace_name":"my-workspace", "organization_name":"acme",
  "notifications": [ { "message":"Run", "trigger":"${trigger}", "trigger_type":"${trigger}",
    "run_status":"${status}" } ] }`;
const scopedBody = (trigger: string, scope: string) =>
  `{ "payload_version" : 2,  "notification_configuration_id":"nc-1",
  "trigger_scope" : "${scope}", "trigger":"${trigger}", "message" : "Event",
  "details" : { "workspace_name":"my-workspace", "organization_name":"acme", "x" : 1 } }`;
for (const b of [runBody("run:created"), scopedBody("workspace:deleted", "workspace")]) {
  assertEquals(JSON.stringify(JSON.parse(b)) !== b, true);
}

const call = (
  body: string | undefined,
  headers: Record<string, string>,
  state: unknown = STATE,
  params: Record<string, unknown> = {},
) => ({
  raw: {
    method: "POST",
    path: "/",
    query: {},
    headers,
    body: body === undefined ? null : JSON.parse(body),
    ...(body === undefined ? {} : { rawBody: body }),
  },
  params,
  state,
  subscriptionId: "sub_2",
});
// deno-lint-ignore no-explicit-any
const ingest = async (t: any, input: ReturnType<typeof call>) =>
  await t.handleIngest!(input, mockCtx().ctx);
const signed = (b: string, state: unknown = STATE, params: Record<string, unknown> = {}) =>
  call(b, { "x-tfe-notification-signature": sign(b) }, state, params);

/** Flip one hex digit at the start, the middle and the end of the signature. */
function flips(sig: string): string[] {
  return [0, Math.floor(sig.length / 2), sig.length - 1].map((i) =>
    sig.slice(0, i) + (sig[i] === "a" ? "b" : "a") + sig.slice(i + 1)
  );
}

const SIGNED = [
  [runCreated, "run:created", runBody("run:created", "pending")],
  [runApplying, "run:applying", runBody("run:applying", "applying")],
  [runCanceled, "run:run_canceled", runBody("run:run_canceled", "canceled")],
  [runPending, "run:pending_apply_approval", runBody("run:pending_apply_approval", "planned")],
  [workspaceDeleted, "workspace:deleted", scopedBody("workspace:deleted", "workspace")],
  [driftDetected, "assessment:drifted", scopedBody("assessment:drifted", "assessment")],
  [anyEvent, "run:completed", runBody("run:completed")],
  [anyEvent, "assessment:failed", scopedBody("assessment:failed", "assessment")],
] as const;

for (const [t, trigger, body] of SIGNED) {
  test(`terraform ${t.key} (${trigger}): HMAC-SHA512 verified, tampering refused`, async () => {
    const out = evs(await ingest(t, signed(body)));
    assertEquals(out.length, 1);
    assertEquals(out[0].trigger, trigger);
    assertEquals(out[0].organizationName, "acme");
    assertEquals(out[0].workspaceName, "my-workspace");

    const good = sign(body);
    for (const bad of flips(good)) {
      const err = await rejects(() =>
        ingest(t, call(body, { "x-tfe-notification-signature": bad }))
      );
      assertEquals(err.message.includes(bad) || err.message.includes(good), false);
    }
    // one flipped byte of the BODY with the original signature
    const tampered = body.replace("my-workspace", "my-workspacf");
    await rejects(() => ingest(t, call(tampered, { "x-tfe-notification-signature": good })));
    await rejects(() => ingest(t, call(body, {})));
    const raw = await rejects(() =>
      ingest(t, call(undefined, { "x-tfe-notification-signature": good }))
    );
    assertEquals(raw.message.includes("raw body"), true);
    for (const s of [null, {}, { ...STATE, token: "" }]) {
      const err = await rejects(() =>
        ingest(t, call(body, { "x-tfe-notification-signature": "" }, s))
      );
      assertEquals(err.message.includes("secret"), true);
    }
    assert(Array.isArray(t.output) && t.output.length > 0 && t.sample !== undefined);
  });
}

test("terraform: a verified delivery for another trigger is acknowledged without a run", async () => {
  assertEquals(evs(await ingest(runCreated, signed(runBody("run:completed")))), []);
  assertEquals(
    evs(await ingest(workspaceDeleted, signed(scopedBody("assessment:drifted", "assessment")))),
    [],
  );
  // the verification request: verified, ignored
  assertEquals(evs(await ingest(anyEvent, signed(runBody("verification")))), []);
  // any-event honours its triggers param
  const only = { triggers: "workspace:deleted" };
  assertEquals(evs(await ingest(anyEvent, signed(runBody("run:completed"), STATE, only))), []);
  assertEquals(
    evs(await ingest(anyEvent, signed(scopedBody("workspace:deleted", "workspace"), STATE, only)))
      .length,
    1,
  );
});

test("terraform workspace events keep their details and any-event refuses non-POST", async () => {
  const [e] = evs(
    await ingest(driftDetected, signed(scopedBody("assessment:drifted", "assessment"))),
  );
  assertEquals(e.triggerScope, "assessment");
  assertEquals(e.details, { workspace_name: "my-workspace", organization_name: "acme", x: 1 });
  const bad = signed(runBody("run:completed"));
  await rejects(() => ingest(anyEvent, { ...bad, raw: { ...bad.raw, method: "GET" } }));
});

test("terraform onSubscribe registers the literal trigger lists", async () => {
  const cases = [
    [runCreated, {}, ["run:created"]],
    [runApplying, {}, ["run:applying"]],
    [runCanceled, {}, ["run:run_canceled"]],
    [runPending, {}, ["run:pending_apply_approval"]],
    [workspaceDeleted, {}, ["workspace:deleted"]],
    [driftDetected, {}, ["assessment:drifted"]],
    [anyEvent, { triggers: "assessment:failed, run:created" }, [
      "assessment:failed",
      "run:created",
    ]],
  ] as const;
  for (const [t, extra, triggers] of cases) {
    const { ctx, calls } = mockCtx([{ status: 201, body: { data: { id: "nc-9" } } }]);
    const state = await t.onSubscribe!({
      params: { workspaceId: "ws-XdeUVMWShTesDMME", ...extra },
      subscriptionId: "sub_2",
      callbackUrl: CALLBACK,
      hostUrl: "",
    }, ctx) as { token: string; notificationConfigurationId: string };
    assertEquals(
      calls[0].url,
      "https://app.terraform.io/api/v2/workspaces/ws-XdeUVMWShTesDMME/notification-configurations",
    );
    const sent = JSON.parse(calls[0].body!);
    assertEquals(sent.data.attributes.triggers, triggers);
    assertEquals(sent.data.attributes["destination-type"], "generic");
    assertEquals(state.notificationConfigurationId, "nc-9");
    assertEquals(state.token, sent.data.attributes.token);
  }
  // all 19 by default; an unknown name is refused before any request
  const all = mockCtx([{ status: 201, body: { data: { id: "nc-1" } } }]);
  await anyEvent.onSubscribe!({
    params: { workspaceId: "ws-XdeUVMWShTesDMME" },
    subscriptionId: "s",
    callbackUrl: CALLBACK,
    hostUrl: "",
  }, all.ctx);
  assertEquals(JSON.parse(all.calls[0].body!).data.attributes.triggers.length, 19);
  const none = mockCtx([]);
  await rejects(() =>
    anyEvent.onSubscribe!({
      params: { workspaceId: "ws-XdeUVMWShTesDMME", triggers: "run:nope" },
      subscriptionId: "s",
      callbackUrl: CALLBACK,
      hostUrl: "",
    }, none.ctx)
  );
  assertEquals(none.calls.length, 0);
});

test("terraform onUnsubscribe deletes the configuration (404 = gone)", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await workspaceDeleted.onUnsubscribe!({ params: {}, state: STATE, subscriptionId: "s" }, ctx);
  assertEquals([calls[0].method, calls[0].url], [
    "DELETE",
    "https://app.terraform.io/api/v2/notification-configurations/nc-1",
  ]);
  await anyEvent.onUnsubscribe!(
    { params: {}, state: STATE, subscriptionId: "s" },
    mockCtx([{ status: 404, statusText: "Not Found", body: {} }]).ctx,
  );
});

// ----- polls ----------------------------------------------------------------------------------

const input = { params: {}, subscriptionId: "sub" };
const page = (data: unknown[], next: number | null = null) => ({
  data,
  meta: { pagination: { "current-page": 1, "next-page": next, "total-count": data.length } },
});
const org = (name: string) => ({
  id: name,
  type: "organizations",
  attributes: { email: `${name}@example.com` },
});
const ws = (id: string, name = id) => ({ id, type: "workspaces", attributes: { name } });
const v = (id: string, key = id) => ({
  id,
  type: "vars",
  attributes: { key, value: "do-not-leak", category: "env", sensitive: false },
});

test("terraform new-organization: seed, new org once, idempotent, literal request, pages", async () => {
  const seeded = await newOrganization.poll!(
    { ...input, state: {} },
    mockCtx([{ body: page([org("a")]) }]).ctx,
  );
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  const body = page([org("a"), org("b")]);
  const m = mockCtx([{ body }]);
  const first = await newOrganization.poll!({ ...input, state: seeded.nextState }, m.ctx);
  assertEquals((first.events as Array<{ id: string }>).map((e) => e.id), ["b"]);
  assertEquals(m.calls.map((c) => [c.method, c.url]), [
    ["GET", "https://app.terraform.io/api/v2/organizations?page%5Bsize%5D=100&page%5Bnumber%5D=1"],
  ]);
  const retry = await newOrganization.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body }]).ctx,
  );
  assertEquals(retry, first);
  // a second page is read when next-page is set
  const two = mockCtx([{ body: page([org("a")], 2) }, { body: page([org("c")]) }]);
  const paged = await newOrganization.poll!({ ...input, state: seeded.nextState }, two.ctx);
  assertEquals((paged.events as Array<{ id: string }>).map((e) => e.id), ["c"]);
  assertEquals(
    two.calls[1].url,
    "https://app.terraform.io/api/v2/organizations?page%5Bsize%5D=100&page%5Bnumber%5D=2",
  );
});

test("terraform new-workspace: needs an organization, requests it literally, emits only new ones", async () => {
  await rejects(() =>
    newWorkspace.poll!({ params: {}, state: {}, subscriptionId: "s" } as never, mockCtx([]).ctx)
  );
  const p = { params: { organization: "acme" }, subscriptionId: "sub" };
  const seed = mockCtx([{ body: page([ws("ws-1")]) }]);
  const seeded = await newWorkspace.poll!({ ...p, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals(
    seed.calls[0].url,
    "https://app.terraform.io/api/v2/organizations/acme/workspaces?page%5Bsize%5D=100&page%5Bnumber%5D=1",
  );
  const body = page([ws("ws-2", "new-one"), ws("ws-1")]);
  const first = await newWorkspace.poll!(
    { ...p, state: seeded.nextState },
    mockCtx([{ body }]).ctx,
  );
  assertEquals(first.events, [{ id: "ws-2", type: "workspaces", name: "new-one" }]);
  const retry = await newWorkspace.poll!(
    { ...p, state: seeded.nextState },
    mockCtx([{ body }]).ctx,
  );
  assertEquals(retry, first);
});

test("terraform new-variable: seed, new variable once, value never emitted, literal request", async () => {
  const p = { params: { workspaceId: "ws-XdeUVMWShTesDMME" }, subscriptionId: "sub" };
  const seeded = await newVariable.poll!(
    { ...p, state: {} },
    mockCtx([{ body: page([v("var-1")]) }]).ctx,
  );
  assertEquals(seeded.events, []);
  const m = mockCtx([{ body: page([v("var-1"), v("var-2", "region")]) }]);
  const first = await newVariable.poll!({ ...p, state: seeded.nextState }, m.ctx);
  assertEquals(first.events, [{
    id: "var-2",
    type: "vars",
    key: "region",
    category: "env",
    sensitive: false,
  }]);
  assertEquals(JSON.stringify(first).includes("do-not-leak"), false);
  assertEquals(m.calls.map((c) => [c.method, c.url]), [
    ["GET", "https://app.terraform.io/api/v2/workspaces/ws-XdeUVMWShTesDMME/vars"],
  ]);
  const retry = await newVariable.poll!(
    { ...p, state: seeded.nextState },
    mockCtx([{ body: page([v("var-1"), v("var-2", "region")]) }]).ctx,
  );
  assertEquals(retry, first);
});

test("terraform new-organization: more than 50 pages fails loudly instead of truncating", async () => {
  const m = mockCtx(Array.from({ length: 50 }, (_, i) => ({ body: page([org(`o${i}`)], i + 2) })));
  let msg = "";
  try {
    await newOrganization.poll!({ ...input, state: {} }, m.ctx);
  } catch (err) {
    msg = (err as Error).message;
  }
  assert(msg.includes("50 pages"), `expected a cap error, got: ${msg}`);
  assertEquals(m.calls.length, 50);
});
