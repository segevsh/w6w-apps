import assert from "node:assert/strict";
import test from "node:test";
import cardDone from "../../triggers/card-done.ts";
import cardMoved from "../../triggers/card-moved.ts";
import newCard from "../../triggers/new-card.ts";
import { mockCtx, normalizeGql } from "../_helpers.ts";

const CALLBACK = "https://w6w.example/triggers/webhooks/sub_123";
const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const post = (body: unknown) => ({ method: "POST", path: "/", query: {}, headers: {}, body });

test("onSubscribe registers card.create for a pipe through createWebhook", async () => {
  const { ctx, calls } = mockCtx([
    { body: { data: { createWebhook: { webhook: { id: "777", actions: ["card.create"] } } } } },
  ]);
  const state = await newCard.onSubscribe!({
    params: { pipeId: "302345678" },
    callbackUrl: CALLBACK,
  }, ctx);
  assert.deepEqual(state, { webhookId: "777" });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].method, "POST");
  assert.equal(calls[0].url, "https://api.pipefy.com/graphql");
  assert.equal(
    normalizeGql(JSON.parse(calls[0].body!).query),
    'mutation { createWebhook(input: { actions: ["card.create"], name: "w6w New Card", pipe_id: 302345678, url: "https://w6w.example/triggers/webhooks/sub_123" }) { webhook { id actions url } } }',
  );
});

test("onSubscribe uses table_id for a database table and card.done / card.move per trigger", async () => {
  const one = mockCtx([{ body: { data: { createWebhook: { webhook: { id: 1 } } } } }]);
  assert.deepEqual(
    await cardDone.onSubscribe!({ params: { tableId: "ZtEdWh" }, callbackUrl: CALLBACK }, one.ctx),
    { webhookId: "1" },
  );
  assert.equal(
    normalizeGql(JSON.parse(one.calls[0].body!).query),
    'mutation { createWebhook(input: { actions: ["card.done"], name: "w6w Card Done", table_id: "ZtEdWh", url: "https://w6w.example/triggers/webhooks/sub_123" }) { webhook { id actions url } } }',
  );
  const two = mockCtx([{ body: { data: { createWebhook: { webhook: { id: 2 } } } } }]);
  await cardMoved.onSubscribe!({ params: { pipeId: "9" }, callbackUrl: CALLBACK }, two.ctx);
  assert.match(JSON.parse(two.calls[0].body!).query, /actions: \["card\.move"\]/);
});

test("onSubscribe refuses neither or both of pipeId and tableId, before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assert.rejects(
    newCard.onSubscribe!({ params: {}, callbackUrl: CALLBACK }, ctx),
    /Pipe ID or the Table ID/,
  );
  await assert.rejects(
    newCard.onSubscribe!({ params: { pipeId: "1", tableId: "2" }, callbackUrl: CALLBACK }, ctx),
    /not both/,
  );
  assert.equal(calls.length, 0);
});

test("onSubscribe fails when Pipefy returns no webhook id", async () => {
  const { ctx } = mockCtx([{ body: { data: { createWebhook: { webhook: {} } } } }]);
  await assert.rejects(
    newCard.onSubscribe!({ params: { pipeId: "1" }, callbackUrl: CALLBACK }, ctx),
    /no id/,
  );
});

test("onUnsubscribe calls deleteWebhook with the stored id", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { deleteWebhook: null } } }]);
  await newCard.onUnsubscribe!({ params: {}, state: { webhookId: "777" } }, ctx);
  assert.equal(calls.length, 1);
  assert.equal(
    normalizeGql(JSON.parse(calls[0].body!).query),
    "mutation { deleteWebhook(input: { id: 777 }) }",
  );
});

test("onUnsubscribe treats a not-found webhook as already gone, rethrows other errors", async () => {
  const gone = mockCtx([{ body: { errors: [{ message: "Webhook resource_not_found" }] } }]);
  await newCard.onUnsubscribe!({ params: {}, state: { webhookId: "777" } }, gone.ctx);
  const bad = mockCtx([{ body: { errors: [{ message: "Permission denied" }] } }]);
  await assert.rejects(
    newCard.onUnsubscribe!({ params: {}, state: { webhookId: "777" } }, bad.ctx),
    /Permission denied/,
  );
  const none = mockCtx([]);
  await newCard.onUnsubscribe!({ params: {}, state: undefined }, none.ctx);
  assert.equal(none.calls.length, 0);
});

test("handleIngest turns a card.create delivery into an event", async () => {
  const out = evs(
    await newCard.handleIngest!({
      raw: post({
        data: {
          action: "card.create",
          on_phase: { id: 123, name: "Inbox" },
          created_by: { id: 5, name: "Ada" },
          card: { id: 123456, pipe_id: "CxeXHeOR" },
        },
      }),
    } as never),
  );
  assert.equal(out.length, 1);
  const e = out[0] as Record<string, unknown>;
  assert.equal(e.action, "card.create");
  assert.equal(e.cardId, "123456");
  assert.equal(e.pipeId, "CxeXHeOR");
  assert.deepEqual(e.phase, { id: 123, name: "Inbox" });
  assert.deepEqual(e.user, { id: 5, name: "Ada" });
});

test("handleIngest reads the move payload's from / to phases and mover", async () => {
  const out = evs(
    await cardMoved.handleIngest!({
      raw: post({
        data: {
          action: "card.move",
          from: { id: 123, name: "Inbox" },
          to: { id: 345, name: "Doing" },
          moved_by: { id: 5 },
          card: { id: 9, title: "Prospect 1", pipe_id: "P" },
        },
      }),
    } as never),
  ) as Array<Record<string, unknown>>;
  assert.equal(out[0].cardTitle, "Prospect 1");
  assert.deepEqual(out[0].fromPhase, { id: 123, name: "Inbox" });
  assert.deepEqual(out[0].toPhase, { id: 345, name: "Doing" });
  assert.deepEqual(out[0].user, { id: 5 });
});

test("handleIngest drops another action's delivery and refuses malformed or non-POST calls", async () => {
  const other = evs(
    await cardDone.handleIngest!({
      raw: post({ data: { action: "card.create", card: { id: 1 } } }),
    } as never),
  );
  assert.deepEqual(other, []);
  await assert.rejects(
    async () => await newCard.handleIngest!({ raw: post({}) } as never),
    /data object/,
  );
  await assert.rejects(
    async () => await newCard.handleIngest!({ raw: post({ data: {} }) } as never),
    /action/,
  );
  await assert.rejects(
    async () => await newCard.handleIngest!({ raw: { ...post({}), method: "GET" } } as never),
    /POST/,
  );
});
