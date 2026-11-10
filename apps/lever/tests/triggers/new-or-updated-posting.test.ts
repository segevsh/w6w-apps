import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-posting.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const posting = (id: string, updatedAt = 1) => ({ id, text: `Role ${id}`, updatedAt });

const run = async (state: unknown, postings: unknown[]) => {
  const mock = mockCtx([{ body: { data: postings, hasNext: false } }]);
  const result = await trigger.poll!({ ...input, state }, mock.ctx);
  return { result, calls: mock.calls };
};

test("new-or-updated-posting: the first check seeds the collection without emitting", async () => {
  const { result } = await run({}, [posting("a")]);
  assertEquals(result.events, []);
  assertEquals((result.nextState as { seeded?: boolean }).seeded, true);
});

test("new-or-updated-posting: a new and an edited posting are each emitted once, and a retry repeats them identically", async () => {
  const seeded = (await run({}, [posting("a")])).result.nextState;
  const page = [posting("a", 2), posting("b")];
  const first = await run(seeded, page);
  const retry = await run(seeded, page);
  assertEquals(first.result.events, [
    { change: "updated", ...posting("a", 2) },
    { change: "added", ...posting("b") },
  ]);
  assertEquals(retry.result, first.result);
});

test("new-or-updated-posting: an unchanged posting is not emitted again", async () => {
  const seeded = (await run({}, [posting("a")])).result.nextState;
  assertEquals((await run(seeded, [posting("a")])).result.events, []);
});

test("new-or-updated-posting: requests exactly the postings endpoint that `posting-list` calls", async () => {
  const { calls } = await run({}, [posting("a")]);
  assertEquals(calls.length, 1);
  assertEquals(
    { method: calls[0].method, url: calls[0].url },
    { method: "GET", url: "https://api.lever.co/v1/postings?confidentiality=all&limit=100" },
  );
});
