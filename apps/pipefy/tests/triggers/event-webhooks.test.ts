import assert from "node:assert/strict";
import test from "node:test";
import anyEvent from "../../triggers/any-event.ts";
import cardCommentCreated from "../../triggers/card-comment-created.ts";
import cardDeleted from "../../triggers/card-deleted.ts";
import cardExpired from "../../triggers/card-expired.ts";
import cardFieldUpdated from "../../triggers/card-field-updated.ts";
import cardLate from "../../triggers/card-late.ts";
import cardOverdue from "../../triggers/card-overdue.ts";
import { mockCtx, normalizeGql } from "../_helpers.ts";

const CALLBACK = "https://w6w.example/triggers/webhooks/sub_123";
const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const SECRET = "test-secret-0123456789abcdef";
const post = (
  body: unknown,
  headers: Record<string, string> = { "X-W6W-Webhook-Secret": SECRET },
) => ({
  method: "POST",
  path: "/",
  query: {},
  headers,
  body,
});

// Payloads copied from https://developers.pipefy.com/reference/pipe-table-webhooks (2026-11-10).
const CASES = [
  {
    trigger: cardDeleted,
    action: "card.delete",
    body: {
      data: {
        action: "card.delete",
        on_phase: { id: 123, name: "Phase 123" },
        deleted_by: { id: 12345, name: "John Doe" },
        card: { id: 1234567, title: "Prospect 1", pipe_id: "CxeXHeOR" },
      },
    },
    expect: { cardId: "1234567", cardTitle: "Prospect 1", user: { id: 12345, name: "John Doe" } },
  },
  {
    trigger: cardFieldUpdated,
    action: "card.field_update",
    body: {
      data: {
        action: "card.field_update",
        field: { id: "text", label: "text", internal_id: 123454321 },
        new_value: "new text value",
        updated_by: { id: 12345, name: "John Doe" },
        card: { id: 123456, pipe_id: "CxeXHeOR" },
      },
    },
    expect: {
      cardId: "123456",
      field: { id: "text", label: "text", internal_id: 123454321 },
      newValue: "new text value",
      user: { id: 12345, name: "John Doe" },
    },
  },
  {
    trigger: cardCommentCreated,
    action: "card.comment_create",
    body: {
      data: {
        action: "card.comment_create",
        on_phase: { id: 273, name: "Bad Reviews" },
        comment: "I approve this request",
        mentioned_users: [],
        made_by: { id: 12347, name: "Rob Doe" },
        card: { id: 1234567, title: "Prospect 1", pipe_id: "CxeXHeOR" },
      },
    },
    expect: {
      cardId: "1234567",
      comment: "I approve this request",
      mentionedUsers: [],
      user: { id: 12347, name: "Rob Doe" },
    },
  },
  {
    trigger: cardLate,
    action: "card.late",
    body: {
      data: {
        action: "card.late",
        on_phase: { id: 123, name: "Phase 123" },
        card: { id: 123456, pipe_id: "CxeXHeOR" },
      },
    },
    expect: { cardId: "123456", phase: { id: 123, name: "Phase 123" }, user: null },
  },
  {
    trigger: cardOverdue,
    action: "card.overdue",
    body: {
      data: {
        action: "card.overdue",
        on_phase: { id: 123, name: "Phase 123" },
        card: { id: 123456, pipe_id: "CxeXHeOR" },
      },
    },
    expect: { cardId: "123456", pipeId: "CxeXHeOR" },
  },
  {
    trigger: cardExpired,
    action: "card.expired",
    body: {
      data: {
        action: "card.expired",
        on_phase: { id: 123, name: "Phase 123" },
        card: { id: 123456, pipe_id: "CxeXHeOR" },
      },
    },
    expect: { cardId: "123456", pipeId: "CxeXHeOR" },
  },
] as const;

for (const c of CASES) {
  const t = c.trigger;
  test(`${t.key}: registers exactly ${c.action} through createWebhook (literal mutation)`, async () => {
    const { ctx, calls } = mockCtx([{
      body: { data: { createWebhook: { webhook: { id: "9" } } } },
    }]);
    const state = await t.onSubscribe!(
      { params: { pipeId: "302345678" }, callbackUrl: CALLBACK },
      ctx,
    );
    const secret = (state as { secret: string }).secret;
    assert.deepEqual(state, { webhookId: "9", secret });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].method, "POST");
    assert.equal(calls[0].url, "https://api.pipefy.com/graphql");
    assert.equal(
      normalizeGql(JSON.parse(calls[0].body!).query).replaceAll(secret, "SECRET"),
      `mutation { createWebhook(input: { actions: ["${c.action}"], headers: "{\\"X-W6W-Webhook-Secret\\":\\"SECRET\\"}", name: "w6w ${t.title}", pipe_id: 302345678, url: "${CALLBACK}" }) { webhook { id actions url } } }`,
    );
  });

  test(`${t.key}: delivers its own payload, drops another action's, refuses a wrong secret`, async () => {
    const state = { webhookId: "9", secret: SECRET };
    const out = evs(await t.handleIngest!({ raw: post(c.body), state } as never));
    assert.equal(out.length, 1);
    const e = out[0] as Record<string, unknown>;
    assert.equal(e.action, c.action);
    for (const [k, v] of Object.entries(c.expect)) assert.deepEqual(e[k], v, k);
    assert.deepEqual(e.data, c.body.data);

    const other = { data: { action: "card.create", card: { id: 1 } } };
    assert.deepEqual(evs(await t.handleIngest!({ raw: post(other), state } as never)), []);

    // The secret header differs by one byte: refused, nothing echoed.
    const flipped = SECRET.slice(0, -1) + "0";
    await assert.rejects(
      async () =>
        await t.handleIngest!(
          { raw: post(c.body, { "X-W6W-Webhook-Secret": flipped }), state } as never,
        ),
      (err: Error) => /refused/.test(err.message) && !err.message.includes(SECRET),
    );
    await assert.rejects(
      async () => await t.handleIngest!({ raw: post(c.body, {}), state } as never),
      /refused/,
    );
    // No stored secret: refused before any compare.
    await assert.rejects(
      async () => await t.handleIngest!({ raw: post(c.body), state: { webhookId: "9" } } as never),
      /not configured/,
    );
  });
}

test("any-event: an empty events list registers every card event for a pipe (literal mutation)", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { createWebhook: { webhook: { id: "5" } } } } }]);
  const state = await anyEvent.onSubscribe!({
    params: { pipeId: "302345678" },
    callbackUrl: CALLBACK,
  }, ctx);
  const secret = (state as { secret: string }).secret;
  const all = [
    "card.create",
    "card.field_update",
    "card.move",
    "card.done",
    "card.delete",
    "card.comment_create",
    "card.email_received",
    "card.late",
    "card.overdue",
    "card.expired",
  ];
  assert.deepEqual(state, { webhookId: "5", secret, actions: all });
  assert.equal(
    normalizeGql(JSON.parse(calls[0].body!).query).replaceAll(secret, "SECRET"),
    `mutation { createWebhook(input: { actions: [${
      all.map((a) => `"${a}"`).join(", ")
    }], headers: "{\\"X-W6W-Webhook-Secret\\":\\"SECRET\\"}", name: "w6w Any Event", pipe_id: 302345678, url: "${CALLBACK}" }) { webhook { id actions url } } }`,
  );
});

test("any-event: for a table the late and expired actions (pipes only) are left out", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { createWebhook: { webhook: { id: "5" } } } } }]);
  await anyEvent.onSubscribe!({ params: { tableId: "ZtEdWh" }, callbackUrl: CALLBACK }, ctx);
  const q = normalizeGql(JSON.parse(calls[0].body!).query);
  assert.match(
    q,
    /actions: \["card\.create", "card\.field_update", "card\.move", "card\.done", "card\.delete", "card\.comment_create", "card\.email_received", "card\.overdue"\]/,
  );
  assert.match(q, /table_id: "ZtEdWh"/);
});

test("any-event: a chosen events list is registered, deduped, and unknown actions refused before any request", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { createWebhook: { webhook: { id: "5" } } } } }]);
  const state = await anyEvent.onSubscribe!(
    {
      params: { pipeId: "1", events: "card.move, automation.execution,card.move" },
      callbackUrl: CALLBACK,
    },
    ctx,
  );
  assert.deepEqual((state as { actions: string[] }).actions, ["card.move", "automation.execution"]);
  assert.match(
    normalizeGql(JSON.parse(calls[0].body!).query),
    /actions: \["card\.move", "automation\.execution"\]/,
  );
  const none = mockCtx([]);
  await assert.rejects(
    anyEvent.onSubscribe!(
      { params: { pipeId: "1", events: "card.nope" }, callbackUrl: CALLBACK },
      none.ctx,
    ),
    /Unknown Pipefy webhook action/,
  );
  assert.equal(none.calls.length, 0);
});

test("any-event: delivers only the registered actions (the event filter) and refuses a wrong secret", async () => {
  const state = { webhookId: "5", secret: SECRET, actions: ["card.move", "card.delete"] };
  const move = {
    data: { action: "card.move", from: { id: 1 }, to: { id: 2 }, card: { id: 7, pipe_id: "P" } },
  };
  const done = { data: { action: "card.done", card: { id: 7, pipe_id: "P" } } };
  const out = evs(await anyEvent.handleIngest!({ raw: post(move), state } as never));
  assert.equal(out.length, 1);
  assert.equal((out[0] as { action: string }).action, "card.move");
  assert.deepEqual(evs(await anyEvent.handleIngest!({ raw: post(done), state } as never)), []);
  const flipped = SECRET.slice(0, -1) + "0";
  await assert.rejects(
    async () =>
      await anyEvent.handleIngest!(
        { raw: post(move, { "X-W6W-Webhook-Secret": flipped }), state } as never,
      ),
    /refused/,
  );
  await assert.rejects(
    async () =>
      await anyEvent.handleIngest!(
        { raw: post(move), state: { webhookId: "5", actions: ["card.move"] } } as never,
      ),
    /not configured/,
  );
});

test("any-event: an automation.execution delivery (no card events) still arrives with its full payload", async () => {
  const body = {
    data: {
      action: "automation.execution",
      payload_id: "p1",
      card: { id: 555, title: "John" },
      pipe: { id: 456 },
    },
  };
  const state = { webhookId: "5", secret: SECRET, actions: ["automation.execution"] };
  const out = evs(await anyEvent.handleIngest!({ raw: post(body), state } as never)) as Array<
    Record<string, unknown>
  >;
  assert.equal(out[0].action, "automation.execution");
  assert.equal(out[0].cardId, "555");
  assert.deepEqual(out[0].data, body.data);
});

test("onUnsubscribe of an any-event subscription deletes the stored webhook", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { deleteWebhook: { success: true } } } }]);
  await anyEvent.onUnsubscribe!({
    params: {},
    state: { webhookId: "5", secret: SECRET, actions: [] },
  }, ctx);
  assert.equal(
    normalizeGql(JSON.parse(calls[0].body!).query),
    "mutation { deleteWebhook(input: { id: 5 }) { success } }",
  );
});
