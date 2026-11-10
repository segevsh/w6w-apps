import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-card-in-list.ts";

const card = (id: string) => ({ id, name: `Card ${id}`, idList: "l1", idBoard: "b1" });
const input = { params: { listId: "l1" }, subscriptionId: "sub_1" };

test("new-card-in-list: seeds, emits only cards new to the list, retries idempotently, requests GET /lists/l1/cards", async () => {
  const seed = mockCtx([{ body: [card("a"), card("b")] }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);

  const response = { body: [card("a"), card("b"), card("c")] };
  const first = mockCtx([response]);
  const retry = mockCtx([response]);
  const result = await trigger.poll!({ ...input, state: seeded.nextState }, first.ctx);
  const repeated = await trigger.poll!({ ...input, state: seeded.nextState }, retry.ctx);
  assertEquals(result.events, [card("c")]);
  assertEquals(repeated.events, result.events);
  assertEquals(first.calls.length, 1);
  assertEquals(first.calls[0].method, "GET");
  const url = new URL(first.calls[0].url);
  assertEquals(`${url.origin}${url.pathname}`, "https://api.trello.com/1/lists/l1/cards");
  assertEquals(url.searchParams.has("limit"), false);
});

test("new-card-in-list: a card moved out, or edited, does not emit; a card moved in does", async () => {
  const seed = mockCtx([{ body: [card("a"), card("b")] }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  const next = mockCtx([{ body: [{ ...card("a"), name: "Renamed" }, card("z")] }]);
  const result = await trigger.poll!({ ...input, state: seeded.nextState }, next.ctx);
  assertEquals(result.events, [card("z")]);
});

test("new-card-in-list: a missing list id is refused before any request", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    () => trigger.poll!({ params: { listId: " " }, subscriptionId: "s", state: {} }, ctx),
    Error,
    "List ID",
  );
  assertEquals(calls.length, 0);
});
