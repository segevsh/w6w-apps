import { test } from "node:test";
import { createHmac } from "node:crypto";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newTask from "../../triggers/new-task.ts";
import taskUpdated from "../../triggers/task-updated.ts";

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);

const SECRET = "b537207f20cbfa02357cf448134da559e8bd39d61597dcd5631b8012eae53e81";
const STATE = { webhookId: "555", secret: SECRET, projectId: "42", action: "added" };
const CALLBACK = "https://w6w.example/triggers/webhooks/sub_1";

// Non-canonical whitespace: JSON.stringify(JSON.parse(BODY)) !== BODY.
const BODY = `{ "events": [ { "user": {"gid": "7", "resource_type": "user"},
  "created_at": "2026-11-09T10:00:00.000Z", "action": "added",
  "resource": {"gid": "100", "resource_type": "task", "resource_subtype": "default_task"},
  "parent": {"gid": "42", "resource_type": "project"} } ] }`;

const sign = (body: string, key = SECRET) => createHmac("sha256", key).update(body).digest("hex");

function call(over: { headers?: Record<string, string>; rawBody?: string | null; body?: unknown }) {
  const rawBody = over.rawBody === null ? undefined : over.rawBody ?? BODY;
  return {
    method: "POST",
    path: "/triggers/webhooks/sub_1",
    query: {},
    headers: over.headers ?? { "x-hook-signature": sign(BODY) },
    body: over.body ?? JSON.parse(BODY),
    ...(rawBody === undefined ? {} : { rawBody }),
  };
}

function ingest(
  raw: ReturnType<typeof call>,
  state: unknown = STATE,
  trigger: typeof newTask = newTask,
) {
  return trigger.handleIngest!(
    { raw, params: { projectId: "42" }, state: state as never, subscriptionId: "sub_1" },
    mockCtx().ctx,
  );
}

test("fixture body is non-canonical JSON", () => {
  assert(JSON.stringify(JSON.parse(BODY)) !== BODY);
});

test("valid signature over the raw body emits one task event", async () => {
  const out = evs(await ingest(call({})));
  assertEquals(out, [{
    taskId: "100",
    action: "added",
    createdAt: "2026-11-09T10:00:00.000Z",
    userId: "7",
    parentId: "42",
    field: null,
    change: null,
    resourceSubtype: "default_task",
  }]);
});

test("a signature over the re-serialised body is refused", async () => {
  const reserialised = sign(JSON.stringify(JSON.parse(BODY)));
  await assertRejects(
    () => ingest(call({ headers: { "x-hook-signature": reserialised } })),
    Error,
    "signature does not match",
  );
});

test("one flipped byte in the body is refused", async () => {
  const flipped = BODY.replace('"gid": "100"', '"gid": "101"');
  await assertRejects(() => ingest(call({ rawBody: flipped })), Error, "signature does not match");
});

test("a missing signature header is refused", async () => {
  await assertRejects(() => ingest(call({ headers: {} })), Error, "X-Hook-Signature is missing");
});

test("a signature made with another secret is refused", async () => {
  await assertRejects(
    () => ingest(call({ headers: { "x-hook-signature": sign(BODY, "x".repeat(64)) } })),
    Error,
    "signature does not match",
  );
});

test("an absent rawBody is refused", async () => {
  await assertRejects(() => ingest(call({ rawBody: null })), Error, "raw body");
});

test("an unset or empty stored secret never verifies", async () => {
  for (const state of [{}, null, { ...STATE, secret: "" }]) {
    await assertRejects(() => ingest(call({ headers: {} }), state), Error, "no signing secret");
  }
  await assertRejects(
    () => ingest(call({ headers: { "x-hook-signature": "" } }), { ...STATE, secret: 7 }),
    Error,
    "secret",
  );
});

test("refusals never echo the secret, the signature or a header value", async () => {
  const bad = "deadbeef".repeat(8);
  const err = await assertRejects(() => ingest(call({ headers: { "x-hook-signature": bad } })));
  assert(!err.message.includes(SECRET) && !err.message.includes(bad));
});

test("the handshake echoes X-Hook-Secret while no secret is stored", async () => {
  const result = await ingest(
    call({ headers: { "x-hook-secret": "handshake0123456789abcdef" }, rawBody: "{}", body: {} }),
    {},
  );
  assertEquals(evs(result), []);
  assertEquals((result as { response?: unknown }).response, {
    headers: { "x-hook-secret": "handshake0123456789abcdef" },
  });
});

test("the handshake is not honoured once a secret is stored", async () => {
  await assertRejects(
    () =>
      ingest(call({ headers: { "x-hook-secret": "handshake0123456789abcdef" }, rawBody: "{}" })),
    Error,
    "X-Hook-Signature is missing",
  );
});

test("a malformed handshake value is not echoed", async () => {
  await assertRejects(
    () => ingest(call({ headers: { "x-hook-secret": "bad value\r\n" } }), {}),
    Error,
    "no signing secret",
  );
});

test("a signed heartbeat with no events acknowledges and emits nothing", async () => {
  const body = '{ "events": [] }';
  const out = await ingest(call({ rawBody: body, headers: { "x-hook-signature": sign(body) } }));
  assertEquals(evs(out), []);
});

test("new-task drops events of another action; task-updated keeps changed", async () => {
  const changed = BODY.replace('"action": "added"', '"action": "changed"');
  const headers = { "x-hook-signature": sign(changed) };
  assertEquals(evs(await ingest(call({ rawBody: changed, headers }))), []);
  const out = evs(
    await ingest(call({ rawBody: changed, headers }), { ...STATE, action: "changed" }, taskUpdated),
  );
  assertEquals((out[0] as { action: string }).action, "changed");
});

test("onSubscribe creates a filtered project webhook and keeps the secret", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: { data: { gid: "555", resource_type: "webhook" }, "X-Hook-Secret": SECRET },
  }]);
  const state = await newTask.onSubscribe!(
    {
      params: { projectId: " 42 " },
      subscriptionId: "sub_1",
      callbackUrl: CALLBACK,
      hostUrl: "https://w6w.example",
    },
    ctx,
  );
  assertEquals(state, { webhookId: "555", secret: SECRET, projectId: "42", action: "added" });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://app.asana.com/api/1.0/webhooks");
  assertEquals(JSON.parse(calls[0].body!), {
    data: {
      resource: "42",
      target: CALLBACK,
      filters: [{ resource_type: "task", action: "added" }],
    },
  });
});

test("onSubscribe undoes the registration when Asana returns no secret", async () => {
  const { ctx, calls } = mockCtx([
    { status: 201, body: { data: { gid: "555" } } },
    { status: 200, body: { data: {} } },
  ]);
  await assertRejects(
    () =>
      newTask.onSubscribe!(
        { params: { projectId: "42" }, subscriptionId: "s", callbackUrl: CALLBACK, hostUrl: "h" },
        ctx,
      ),
    Error,
    "X-Hook-Secret",
  );
  assertEquals(calls.map((c) => `${c.method} ${new URL(c.url).pathname}`), [
    "POST /api/1.0/webhooks",
    "DELETE /api/1.0/webhooks/555",
  ]);
});

test("onSubscribe without a project is refused before any request", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    () =>
      newTask.onSubscribe!(
        { params: {}, subscriptionId: "s", callbackUrl: CALLBACK, hostUrl: "h" },
        ctx,
      ),
    Error,
    "Project ID",
  );
  assertEquals(calls.length, 0);
});

test("onUnsubscribe deletes the webhook; 404 and 410 mean already gone", async () => {
  for (const status of [200, 404, 410]) {
    const { ctx, calls } = mockCtx([{ status, body: { data: {} } }]);
    await newTask.onUnsubscribe!(
      { params: {}, state: STATE as never, subscriptionId: "sub_1" },
      ctx,
    );
    assertEquals(calls.length, 1);
    assertEquals(calls[0].method, "DELETE");
    assertEquals(calls[0].url, "https://app.asana.com/api/1.0/webhooks/555");
  }
  const { ctx } = mockCtx([{ status: 500, body: { errors: [] } }]);
  await assertRejects(
    () =>
      newTask.onUnsubscribe!({ params: {}, state: STATE as never, subscriptionId: "sub_1" }, ctx),
    Error,
    "Asana 500",
  );
});

test("onUnsubscribe with no stored webhook makes no request", async () => {
  const { ctx, calls } = mockCtx();
  await newTask.onUnsubscribe!({ params: {}, state: {} as never, subscriptionId: "s" }, ctx);
  assertEquals(calls.length, 0);
});
