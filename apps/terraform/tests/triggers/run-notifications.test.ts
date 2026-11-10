import { test } from "node:test";
import { createHmac } from "node:crypto";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import runCompleted from "../../triggers/run-completed.ts";
import runErrored from "../../triggers/run-errored.ts";
import runNeedsAttention from "../../triggers/run-needs-attention.ts";
import runEvent from "../../triggers/run-event.ts";

/** This app's generated `_assert.ts` has no async variant: resolve to the rejection, or fail. */
async function assertRejects(fn: () => PromiseLike<unknown>): Promise<Error> {
  try {
    await fn();
  } catch (err) {
    assert(err instanceof Error, "rejected with a non-Error");
    return err;
  }
  throw new Error("Expected the promise to reject.");
}

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const TOKEN = "notification-token-for-tests-0123456789";
const CALLBACK = "https://api.example.test/triggers/webhooks/sub_1";
const STATE = {
  workspaceId: "ws-XdeUVMWShTesDMME",
  notificationConfigurationId: "nc-1",
  token: TOKEN,
};

const sign = (body: string, key = TOKEN) => createHmac("sha512", key).update(body).digest("hex");

// Non-canonical whitespace: JSON.stringify(JSON.parse(body)) !== body.
const payload = (trigger = "run:completed", triggerType = trigger, extra = "") =>
  `{ "payload_version" : 1,  "notification_configuration_id":"nc-1",
  "run_url":"https://app.terraform.io/app/acme/ws/runs/run-1", "run_id" : "run-1",
  "run_message":"Add queue workers", "run_created_at":"2026-11-09T18:34:00.000Z",
  "run_created_by":"sample-user", "workspace_id":"ws-XdeUVMWShTesDMME",
  "workspace_name":"my-workspace", "organization_name":"acme"${extra},
  "notifications": [ { "message":"Run Completed", "trigger":"${trigger}",
    "trigger_type":"${triggerType}", "run_status":"applied",
    "run_updated_at":"2026-11-09T18:37:04.000Z", "run_updated_by":"sample-user" } ] }`;

const call = (
  b: string | null,
  headers: Record<string, string> = {},
  state: unknown = STATE,
  params: Record<string, unknown> = {},
  over: Record<string, unknown> = {},
) => ({
  raw: {
    method: "POST",
    path: "/",
    query: {},
    headers,
    body: b === null ? null : JSON.parse(b),
    ...(b === null ? {} : { rawBody: b }),
    ...over,
  },
  params,
  state,
  subscriptionId: "sub_1",
});

const signed = (b: string, state: unknown = STATE, params: Record<string, unknown> = {}) =>
  call(b, { "x-tfe-notification-signature": sign(b) }, state, params);

const ingest = (t: typeof runCompleted, input: ReturnType<typeof call>) =>
  t.handleIngest!(input, mockCtx().ctx);

test("fixture body has non-canonical whitespace", () => {
  const b = payload();
  assert(JSON.stringify(JSON.parse(b)) !== b);
});

test("app declares the four webhook triggers with output and sample, no poll", () => {
  assertEquals(app.triggers.map((t) => t.key), [
    "run-completed",
    "run-errored",
    "run-needs-attention",
    "run-event",
  ]);
  for (const t of app.triggers) {
    assert(t.output!.length > 0);
    assert(t.sample !== undefined);
    assertEquals(t.poll, undefined);
    assertEquals(typeof t.onSubscribe, "function");
    assertEquals(typeof t.onUnsubscribe, "function");
    assertEquals(typeof t.handleIngest, "function");
  }
});

test("valid signature (node:crypto HMAC-SHA512 of the exact body) → one normalized event", async () => {
  const out = evs(await ingest(runCompleted, signed(payload()))) as Array<Record<string, unknown>>;
  assertEquals(out.length, 1);
  assertEquals(out[0].trigger, "run:completed");
  assertEquals(out[0].runId, "run-1");
  assertEquals(out[0].runStatus, "applied");
  assertEquals(out[0].workspaceName, "my-workspace");
  assertEquals(out[0].organizationName, "acme");
  assertEquals(out[0].runUpdatedBy, "sample-user");
  assertEquals(out[0].notificationConfigurationId, "nc-1");
});

test("the specific trigger_type decides which trigger a notification belongs to", async () => {
  // run_canceled is reported under trigger run:errored with trigger_type run:run_canceled
  const b = payload("run:errored", "run:run_canceled");
  assertEquals(evs(await ingest(runErrored, signed(b))), []);
  assertEquals(evs(await ingest(runEvent, signed(b))).length, 1);
  assertEquals(
    evs(await ingest(runEvent, signed(b, STATE, { triggers: "run:run_canceled" }))).length,
    1,
  );
});

test("a verified notification the trigger was not asked for is acknowledged without a run", async () => {
  const b = payload("run:planning");
  assertEquals(evs(await ingest(runCompleted, signed(b))), []);
  assertEquals(evs(await ingest(runNeedsAttention, signed(b))), []);
  assertEquals(evs(await ingest(runEvent, signed(b, STATE, { triggers: "run:applying" }))), []);
  assertEquals(evs(await ingest(runEvent, signed(b))).length, 1);
});

test("the verification request (trigger: verification) is verified and ignored", async () => {
  assertEquals(evs(await ingest(runEvent, signed(payload("verification")))), []);
});

test("one flipped byte in the body → throws, echoing neither signature nor token", async () => {
  const b = payload();
  const sig = sign(b);
  const flipped = b.replace("run-1", "run-2");
  const err = await assertRejects(() =>
    ingest(runCompleted, call(flipped, { "x-tfe-notification-signature": sig })) as Promise<unknown>
  );
  assert(!err.message.includes(sig));
  assert(!err.message.includes(TOKEN));
});

test("one flipped byte in the signature → throws", async () => {
  const b = payload();
  const good = sign(b);
  const bad = good.slice(0, -1) + (good.endsWith("0") ? "1" : "0");
  await assertRejects(() =>
    ingest(runCompleted, call(b, { "x-tfe-notification-signature": bad })) as Promise<unknown>
  );
});

test("a signature made with another token → throws", async () => {
  const b = payload();
  await assertRejects(() =>
    ingest(
      runCompleted,
      call(b, { "x-tfe-notification-signature": sign(b, "another-token") }),
    ) as Promise<unknown>
  );
});

test("a SHA-256 signature is not accepted in place of the SHA-512 one", async () => {
  const b = payload();
  const sha256 = createHmac("sha256", TOKEN).update(b).digest("hex");
  await assertRejects(() =>
    ingest(runCompleted, call(b, { "x-tfe-notification-signature": sha256 })) as Promise<unknown>
  );
});

test("signature header missing → throws", async () => {
  const err = await assertRejects(() => ingest(runCompleted, call(payload())) as Promise<unknown>);
  assert(/signature header is missing/.test(err.message));
});

test("rawBody absent → throws (never re-serialises the parsed body)", async () => {
  const b = payload();
  const input = signed(b);
  delete (input.raw as { rawBody?: string }).rawBody;
  assert(input.raw.body !== null);
  const err = await assertRejects(() => ingest(runCompleted, input) as Promise<unknown>);
  assert(/raw body/i.test(err.message));
});

test("empty, missing or non-string token in state → throws before any compare", async () => {
  for (const state of [{ token: "" }, {}, null, { token: 7 }]) {
    // an absent signature header must not verify against an unset token
    const err = await assertRejects(() =>
      ingest(runCompleted, call(payload(), {}, state)) as Promise<unknown>
    );
    assert(/secret/i.test(err.message));
    // nor must a signature made under the empty key
    const b = payload();
    const err2 = await assertRejects(() =>
      ingest(
        runCompleted,
        call(b, {
          "x-tfe-notification-signature": createHmac("sha512", "x").update(b).digest("hex"),
        }, state),
      ) as Promise<unknown>
    );
    assert(/secret/i.test(err2.message));
  }
});

test("a correctly signed body that is not a run notification → throws", async () => {
  await assertRejects(() =>
    ingest(runCompleted, signed('{ "payload_version": 2 }')) as Promise<unknown>
  );
  await assertRejects(() => ingest(runCompleted, signed("not json")) as Promise<unknown>);
});

test("a non-POST method → throws", async () => {
  const b = payload();
  const input = call(b, { "x-tfe-notification-signature": sign(b) }, STATE, {}, { method: "GET" });
  await assertRejects(() => ingest(runCompleted, input) as Promise<unknown>);
});

test("onSubscribe creates a generic notification configuration with a random token", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: { data: { id: "nc-AeUQ2zfKZzW9TiGZ", type: "notification-configurations" } },
  }]);
  const state = await runCompleted.onSubscribe!(
    {
      params: { workspaceId: "ws-XdeUVMWShTesDMME" },
      subscriptionId: "sub_1",
      callbackUrl: CALLBACK,
      hostUrl: "",
    },
    ctx,
  ) as { workspaceId: string; notificationConfigurationId: string; token: string };
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(
    calls[0].url,
    "https://app.terraform.io/api/v2/workspaces/ws-XdeUVMWShTesDMME/notification-configurations",
  );
  assertEquals(calls[0].headers["content-type"], "application/vnd.api+json");
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.data.type, "notification-configuration");
  assertEquals(sent.data.attributes["destination-type"], "generic");
  assertEquals(sent.data.attributes.enabled, true);
  assertEquals(sent.data.attributes.url, CALLBACK);
  assertEquals(sent.data.attributes.triggers, ["run:completed"]);
  assert(/^[0-9a-f]{64}$/.test(sent.data.attributes.token));
  assertEquals(state, {
    workspaceId: "ws-XdeUVMWShTesDMME",
    notificationConfigurationId: "nc-AeUQ2zfKZzW9TiGZ",
    token: sent.data.attributes.token,
  });
});

test("onSubscribe: run-event sends the chosen triggers (default all 13); a name is resolved to an id", async () => {
  const one = mockCtx([{ status: 201, body: { data: { id: "nc-1" } } }]);
  await runEvent.onSubscribe!(
    {
      params: { workspaceId: "ws-1", triggers: "run:errored, run:planning" },
      subscriptionId: "s",
      callbackUrl: CALLBACK,
      hostUrl: "",
    },
    one.ctx,
  );
  assertEquals(JSON.parse(one.calls[0].body!).data.attributes.triggers, [
    "run:errored",
    "run:planning",
  ]);
  const named = mockCtx([
    { body: { data: { id: "ws-from-name", type: "workspaces", attributes: { name: "prod" } } } },
    { status: 201, body: { data: { id: "nc-2" } } },
  ]);
  const state = await runEvent.onSubscribe!(
    {
      params: { organization: "acme", workspace: "prod" },
      subscriptionId: "s",
      callbackUrl: CALLBACK,
      hostUrl: "",
    },
    named.ctx,
  ) as { workspaceId: string };
  assertEquals(
    named.calls[0].url,
    "https://app.terraform.io/api/v2/organizations/acme/workspaces/prod",
  );
  assertEquals(
    named.calls[1].url,
    "https://app.terraform.io/api/v2/workspaces/ws-from-name/notification-configurations",
  );
  assertEquals(state.workspaceId, "ws-from-name");
  assertEquals(JSON.parse(named.calls[1].body!).data.attributes.triggers.length, 13);
});

test("onSubscribe refuses an unknown trigger before any request, and a missing id after one", async () => {
  const none = mockCtx([]);
  await assertRejects(() =>
    Promise.resolve(runEvent.onSubscribe!(
      {
        params: { workspaceId: "ws-1", triggers: "run:made_up" },
        subscriptionId: "s",
        callbackUrl: CALLBACK,
        hostUrl: "",
      },
      none.ctx,
    ))
  );
  assertEquals(none.calls.length, 0);
  const noId = mockCtx([{ status: 201, body: { data: {} } }]);
  await assertRejects(() =>
    Promise.resolve(runCompleted.onSubscribe!(
      { params: { workspaceId: "ws-1" }, subscriptionId: "s", callbackUrl: CALLBACK, hostUrl: "" },
      noId.ctx,
    ))
  );
});

test("onUnsubscribe DELETEs /notification-configurations/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await runCompleted.onUnsubscribe!({ params: {}, state: STATE, subscriptionId: "sub_1" }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, "https://app.terraform.io/api/v2/notification-configurations/nc-1");
});

test("onUnsubscribe: 404 = already gone; any other error propagates; no state = no call", async () => {
  const gone = mockCtx([{
    status: 404,
    body: { errors: [{ status: "404", title: "not found" }] },
  }]);
  await runCompleted.onUnsubscribe!({ params: {}, state: STATE, subscriptionId: "s" }, gone.ctx);
  const boom = mockCtx([{ status: 500, body: { errors: [{ status: "500", title: "boom" }] } }]);
  await assertRejects(() =>
    Promise.resolve(
      runCompleted.onUnsubscribe!({ params: {}, state: STATE, subscriptionId: "s" }, boom.ctx),
    )
  );
  const none = mockCtx([]);
  await runCompleted.onUnsubscribe!(
    { params: {}, state: undefined, subscriptionId: "s" },
    none.ctx,
  );
  assertEquals(none.calls.length, 0);
});
