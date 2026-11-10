import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-segment.ts";

const input = { params: {}, subscriptionId: "sub_1" };
const segment = (id: string) => ({ id, name: `Segment ${id}`, color: "#ff0000" });
const page = (ids: string[], totalPages = 1) => ({
  body: { meta: { page: 1, total_pages: totalPages, per_page: 100 }, data: ids.map(segment) },
});

test("new-segment: seeds, emits only added segments, retries idempotently, and requests GET /v1/segments?page=1&per_page=100", async () => {
  const seed = mockCtx([page(["a"])]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);

  const first = mockCtx([page(["a", "b"])]);
  const retry = mockCtx([page(["a", "b"])]);
  const result = await trigger.poll!({ ...input, state: seeded.nextState }, first.ctx);
  const repeated = await trigger.poll!({ ...input, state: seeded.nextState }, retry.ctx);
  assertEquals(result.events, [segment("b")]);
  assertEquals(repeated.events, result.events);
  assertEquals(first.calls[0].method, "GET");
  assertEquals(first.calls[0].url, "https://api.flodesk.com/v1/segments?page=1&per_page=100");
});

test("new-segment: reads every page and fails loudly past the five-page cap", async () => {
  const two = mockCtx([page(["a"], 2), page(["b"], 2)]);
  const out = await trigger.poll!({ ...input, state: {} }, two.ctx);
  assertEquals(two.calls.length, 2);
  assertEquals(new URL(two.calls[1].url).searchParams.get("page"), "2");
  assertEquals((out.nextState as { seeded?: boolean }).seeded, true);

  const many = mockCtx(Array.from({ length: 5 }, (_, i) => page([`s${i}`], 6)));
  let message = "";
  try {
    await trigger.poll!({ ...input, state: {} }, many.ctx);
  } catch (error) {
    message = (error as Error).message;
  }
  assertEquals(message.includes("more than 500 segments"), true);
});
