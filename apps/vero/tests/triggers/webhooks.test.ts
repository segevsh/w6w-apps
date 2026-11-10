import { test } from "node:test";
import { readFileSync } from "node:fs";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import veroEvent from "../../triggers/vero-event.ts";

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const CALLBACK = "https://api.example.test/triggers/webhooks/sub_1";

const opened = {
  opened_at: 1435016238,
  user_agent: "Mozilla/5.0 (compatible)",
  ip: "203.0.113.7",
  bot: false,
  type: "opened",
  user: { id: 123, email: "ada@example.com" },
  campaign: { id: 987, type: "transactional", name: "Order confirmation", channel: "email" },
  message_id: "20190730123456.1.ABCDEF@veromail.com",
};

const bounced = {
  bounced_at: 1435016299,
  bounce_type: "hard",
  bounce_code: 550,
  bounce_message: "5.5.1 The email account does not exist.",
  type: "bounced",
  user: { id: 123, email: "ada@example.com" },
  campaign: { id: 987, type: "transactional", name: "Order confirmation" },
};

const userUpdated = {
  action: "user_updated",
  type: "user_updated",
  user: { id: 123, email: "ada@example.com" },
  id: "123",
  email: "ada@example.com",
  changes: { _tags: { add: ["active-customer"], remove: ["unactive-180-days"] } },
};

const call = (body: unknown, params: Record<string, unknown> = {}, method = "POST") => ({
  raw: { method, path: "/", query: {}, headers: {} as Record<string, string>, body },
  params,
  state: { callbackUrl: CALLBACK },
  subscriptionId: "sub_1",
});

const ingest = (input: ReturnType<typeof call>) => veroEvent.handleIngest!(input, mockCtx().ctx);

test("app declares the webhook trigger with output and sample, no poll", () => {
  assertEquals(app.triggers.map((t) => t.key), ["vero-event"]);
  assert(veroEvent.output!.length > 0);
  assert(veroEvent.sample !== undefined);
  assertEquals(veroEvent.poll, undefined);
  assertEquals(typeof veroEvent.onSubscribe, "function");
  assertEquals(typeof veroEvent.onUnsubscribe, "function");
  // unsigned vendor: no secret param, no invented signature
  assert(!(veroEvent.params ?? []).some((p) => p.type === "secret"));
});

test("manual receiver: onSubscribe hands back the callback URL and calls nothing; onUnsubscribe is a no-op", async () => {
  const { ctx, calls } = mockCtx([]);
  const state = await veroEvent.onSubscribe!(
    { params: {}, subscriptionId: "sub_1", callbackUrl: CALLBACK, hostUrl: "" },
    ctx,
  );
  assertEquals(state, { callbackUrl: CALLBACK });
  await veroEvent.onUnsubscribe!({ params: {}, state, subscriptionId: "sub_1" }, ctx);
  assertEquals(calls.length, 0);
});

test("onSubscribe refuses an unknown event name", async () => {
  await assertRejects(async () =>
    await veroEvent.onSubscribe!(
      {
        params: { events: "opened, exploded" },
        subscriptionId: "s",
        callbackUrl: CALLBACK,
        hostUrl: "",
      },
      mockCtx().ctx,
    )
  );
});

test("an opened delivery is parsed into one event", async () => {
  const out = evs(await ingest(call(opened))) as Array<Record<string, unknown>>;
  assertEquals(out.length, 1);
  assertEquals(out[0].type, "opened");
  assertEquals(out[0].occurredAt, 1435016238);
  assertEquals(out[0].userId, "123");
  assertEquals(out[0].email, "ada@example.com");
  assertEquals(out[0].messageId, "20190730123456.1.ABCDEF@veromail.com");
  assertEquals(out[0].userAgent, "Mozilla/5.0 (compatible)");
  assertEquals(out[0].ip, "203.0.113.7");
  assertEquals(out[0].bot, false);
  assertEquals((out[0].campaign as { name: string }).name, "Order confirmation");
  assertEquals(out[0].data, opened);
});

test("bounce details and user-update changes are carried", async () => {
  const b = evs(await ingest(call(bounced))) as Array<Record<string, unknown>>;
  assertEquals(b[0].bounceType, "hard");
  assertEquals(b[0].bounceCode, 550);
  assertEquals(b[0].bounceMessage, "5.5.1 The email account does not exist.");
  assertEquals(b[0].occurredAt, 1435016299);
  const u = evs(await ingest(call(userUpdated))) as Array<Record<string, unknown>>;
  assertEquals(u[0].type, "user_updated");
  assertEquals(u[0].occurredAt, null);
  assertEquals(u[0].userId, "123");
  assertEquals(u[0].changes, {
    _tags: { add: ["active-customer"], remove: ["unactive-180-days"] },
  });
});

test("the events param drops the types it leaves out", async () => {
  assertEquals(evs(await ingest(call(opened, { events: "bounced, user_updated" }))), []);
  assertEquals(evs(await ingest(call(bounced, { events: "bounced, user_updated" }))).length, 1);
  assertEquals(evs(await ingest(call(userUpdated, { events: " User_Updated " }))).length, 1);
  assertEquals(evs(await ingest(call(opened, { events: "" }))).length, 1);
});

test("a JSON string body is parsed; a body without a type or a non-POST method is refused", async () => {
  assertEquals(evs(await ingest(call(JSON.stringify(opened)))).length, 1);
  for (const body of [null, "not json", [1, 2], 7, {}, { user: { id: 1 } }]) {
    await assertRejects(async () => await ingest(call(body)));
  }
  await assertRejects(async () => await ingest(call(opened, {}, "GET")));
});

test("README states the URL-is-the-secret trust model", () => {
  const readme = readFileSync(new URL("../../README.md", import.meta.url), "utf8");
  assert(/## Triggers/.test(readme));
  assert(/callback URL is the secret/i.test(readme));
});
