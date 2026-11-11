import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-workflow.ts";

const input = { params: {}, subscriptionId: "sub_1" };
const workflow = (id: string) => ({ id, name: `Workflow ${id}` });
const page = (ids: string[], totalPages = 1) => ({
  body: { meta: { page: 1, total_pages: totalPages, per_page: 100 }, data: ids.map(workflow) },
});

test("new-workflow: seeds, emits only added workflows, retries idempotently, and requests GET /v1/workflows?page=1&perPage=100", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, mockCtx([page(["a"])]).ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);

  const first = mockCtx([page(["a", "b"])]);
  const retry = mockCtx([page(["a", "b"])]);
  const result = await trigger.poll!({ ...input, state: seeded.nextState }, first.ctx);
  const repeated = await trigger.poll!({ ...input, state: seeded.nextState }, retry.ctx);
  assertEquals(result.events, [workflow("b")]);
  assertEquals(repeated.events, result.events);
  assertEquals(first.calls[0].method, "GET");
  assertEquals(first.calls[0].url, "https://api.flodesk.com/v1/workflows?page=1&perPage=100");
});

test("new-workflow: reads every page and fails loudly past the fifty-page cap", async () => {
  const two = mockCtx([page(["a"], 2), page(["b"], 2)]);
  const out = await trigger.poll!({ ...input, state: {} }, two.ctx);
  assertEquals(two.calls.length, 2);
  assertEquals(two.calls[1].url, "https://api.flodesk.com/v1/workflows?page=2&perPage=100");
  assertEquals((out.nextState as { seeded?: boolean }).seeded, true);

  const many = mockCtx(Array.from({ length: 50 }, (_, i) => page([`w${i}`], 51)));
  let message = "";
  try {
    await trigger.poll!({ ...input, state: {} }, many.ctx);
  } catch (error) {
    message = (error as Error).message;
  }
  assertEquals(message.includes("more than 5000 workflows"), true);
});
