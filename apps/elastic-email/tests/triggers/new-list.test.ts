import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";
import trigger from "../../triggers/new-list.ts";

const input = { params: {}, subscriptionId: "sub_1" };
const list = (id: string) => ({ ListName: `List ${id}`, PublicListID: id });

test("new-list: seeds, emits only added lists, retries idempotently, and requests GET /v4/lists?limit=5000", async () => {
  const seed = mockCtx([{ body: [list("a")] }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);

  const first = mockCtx([{ body: [list("a"), list("b")] }]);
  const retry = mockCtx([{ body: [list("a"), list("b")] }]);
  const result = await trigger.poll!({ ...input, state: seeded.nextState }, first.ctx);
  const repeated = await trigger.poll!({ ...input, state: seeded.nextState }, retry.ctx);
  assertEquals(result.events, [list("b")]);
  assertEquals(repeated.events, result.events);
  assertEquals(first.calls[0].method, "GET");
  assertEquals(pathOf(first.calls[0].url), "/v4/lists");
  assertEquals(queryOf(first.calls[0].url), { limit: "5000" });
});
