import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-email.ts";

const PAGE = { body: { value: [{ id: "old", subject: "Earlier" }] } };

test("new-email seeds without emitting, then emits only the unseen message", async () => {
  const { ctx, calls } = mockCtx([
    PAGE,
    { body: { value: [{ id: "new", subject: "New" }, ...PAGE.body.value] } },
  ]);
  const seeded = await trigger.poll!({ params: {}, state: {}, subscriptionId: "sub" }, ctx);
  assertEquals(seeded.events, []);
  assertEquals(seeded.nextState?.seeded, true);

  const next = await trigger.poll!(
    { params: {}, state: seeded.nextState!, subscriptionId: "sub" },
    ctx,
  );
  assertEquals(next.events, [{ id: "new", subject: "New" }]);
  assertEquals(calls[0], {
    method: "GET",
    url: "https://graph.microsoft.com/v1.0/me/messages?%24orderby=receivedDateTime+desc&%24top=100",
    headers: {},
    body: null,
  });
});

test("new-email is idempotent for the same cursor and response", async () => {
  const state = { v: 1 as const, kind: "ids" as const, seeded: true as const, ids: ["old"] };
  const page = { body: { value: [{ id: "new" }, { id: "old" }] } };
  const one = await trigger.poll!(
    { params: {}, state, subscriptionId: "sub" },
    mockCtx([page]).ctx,
  );
  const two = await trigger.poll!(
    { params: {}, state, subscriptionId: "sub" },
    mockCtx([page]).ctx,
  );
  assertEquals(one, two);
});
