import { test } from "node:test";
import { createHmac } from "node:crypto";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import added from "../../triggers/task-added.ts";
import completed from "../../triggers/task-completed.ts";
import updated from "../../triggers/task-updated.ts";

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const SECRET = "client-secret-value-for-tests-0123";
const CALLBACK = "https://api.example.test/triggers/webhooks/sub_1";

// Non-canonical whitespace: JSON.stringify(JSON.parse(BODY)) !== BODY.
const body = (name: string) =>
  `{ "event_name" : "${name}",  "user_id":"2671355",
  "triggered_at":"2026-11-09T10:15:00.000000Z",
  "event_data": { "id":"6012587408", "content":"Buy milk", "project_id":"2203306141" } }`;
const ADDED = body("item:added");

const sign = (b: string, secret = SECRET) =>
  createHmac("sha256", secret).update(b).digest("base64");

const call = (
  b: string,
  over: Record<string, unknown> = {},
  secret: string | undefined | null = SECRET,
) => ({
  raw: {
    method: "POST",
    path: "/",
    query: {},
    headers: { "x-todoist-hmac-sha256": sign(b), "x-todoist-delivery-id": "del-1" } as Record<
      string,
      string
    >,
    body: JSON.parse(b),
    rawBody: b,
    ...over,
  },
  params: { signingSecret: secret === null ? undefined : secret },
  state: { callbackUrl: CALLBACK },
  subscriptionId: "sub_1",
});

const ingest = (t: typeof added, input: ReturnType<typeof call>) =>
  t.handleIngest!(input, mockCtx().ctx);

test("fixture body has non-canonical whitespace", () => {
  assert(JSON.stringify(JSON.parse(ADDED)) !== ADDED);
});

test("app declares the three webhook triggers with output and sample", () => {
  assertEquals(app.triggers.map((t) => t.key), ["task-added", "task-completed", "task-updated"]);
  for (const t of app.triggers) {
    assert(t.output!.length > 0);
    assert(t.sample !== undefined);
    assertEquals(t.poll, undefined);
    assertEquals(t.params!.map((p) => p.key), ["signingSecret"]);
  }
});

test("valid signature → one normalized event per event name", async () => {
  for (
    const [t, name] of [[added, "item:added"], [completed, "item:completed"], [
      updated,
      "item:updated",
    ]] as const
  ) {
    const out = evs(await ingest(t, call(body(name)))) as Array<Record<string, unknown>>;
    assertEquals(out.length, 1);
    assertEquals(out[0].eventName, name);
    assertEquals(out[0].itemId, "6012587408");
    assertEquals(out[0].deliveryId, "del-1");
    assertEquals((out[0].data as { content: string }).content, "Buy milk");
  }
});

test("another event is acknowledged with no event", async () => {
  assertEquals(evs(await ingest(added, call(body("item:completed")))), []);
});

test("one flipped byte in the body → refused", async () => {
  await assertRejects(
    () => ingest(added, call(ADDED, { rawBody: ADDED.replace("Buy milk", "Buy mild") })),
    Error,
    "signature",
  );
});

test("signature made with another secret → refused", async () => {
  const c = call(ADDED, {
    headers: { "x-todoist-hmac-sha256": sign(ADDED, "another-secret-value-xxxxxxxx") },
  });
  await assertRejects(() => ingest(added, c), Error, "signature");
});

test("header missing → refused", async () => {
  await assertRejects(
    () => ingest(added, call(ADDED, { headers: {} })),
    Error,
    "X-Todoist-Hmac-SHA256",
  );
});

test("rawBody absent → refused, even with a correct signature", async () => {
  const c = call(ADDED);
  delete (c.raw as { rawBody?: string }).rawBody;
  await assertRejects(() => ingest(added, c), Error, "raw body");
});

test("unset or empty secret + absent or empty header → refused", async () => {
  for (const secret of [null, ""]) {
    for (const headers of [{}, { "x-todoist-hmac-sha256": "" }]) {
      await assertRejects(() => ingest(added, call(ADDED, { headers }, secret)), Error, "secret");
    }
  }
});

test("errors never contain the secret, the signature or the header value", async () => {
  const sig = sign(ADDED, "another-secret-value-xxxxxxxx");
  try {
    await ingest(added, call(ADDED, { headers: { "x-todoist-hmac-sha256": sig } }));
    assert(false, "must throw");
  } catch (e) {
    const m = (e as Error).message;
    assert(!m.includes(SECRET) && !m.includes(sig));
  }
});

test("a non-POST call is refused", async () => {
  await assertRejects(() => ingest(added, call(ADDED, { method: "GET" })), Error, "POST");
});

test("onSubscribe makes no vendor call and returns the callback URL; onUnsubscribe is a no-op", async () => {
  const { ctx, calls } = mockCtx();
  const state = await added.onSubscribe!(
    { params: {}, subscriptionId: "sub_1", callbackUrl: CALLBACK, hostUrl: "" },
    ctx,
  );
  assertEquals(state, { callbackUrl: CALLBACK });
  await added.onUnsubscribe!({ params: {}, state, subscriptionId: "sub_1" }, ctx);
  assertEquals(calls.length, 0);
});
