import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-list.ts";

const input = { params: {}, subscriptionId: "sub_1" };
const list = (id: string) => ({ id, name: `List ${id}`, created_at: "2026-11-09T12:00:00Z" });

test("new-list: seeds, emits only added lists, retries idempotently, and requests GET /lists?limit=100", async () => {
  const seed = mockCtx([{ body: { data: [list("a")] } }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);

  const response = { body: { data: [list("a"), list("b")] } };
  const first = mockCtx([response]);
  const retry = mockCtx([response]);
  const result = await trigger.poll!({ ...input, state: seeded.nextState }, first.ctx);
  const repeated = await trigger.poll!({ ...input, state: seeded.nextState }, retry.ctx);
  assertEquals(result.events, [list("b")]);
  assertEquals(repeated.events, result.events);
  assertEquals(first.calls[0].method, "GET");
  assertEquals(first.calls[0].url, "https://api.emailoctopus.com/lists?limit=100");
});

test("new-list: follows the cursor and fails loudly past the ten-page cap", async () => {
  const pages = Array.from({ length: 10 }, (_, i) => ({
    body: { data: [list(`l${i}`)], paging: { next: { starting_after: `t${i}` } } },
  }));
  const { ctx } = mockCtx(pages);
  await assertRejects(
    async () => await trigger.poll!({ ...input, state: {} }, ctx),
    Error,
    "more than 1000 lists",
  );
});
