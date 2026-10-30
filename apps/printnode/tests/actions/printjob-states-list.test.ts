import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import states from "../../actions/printjob-states-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

test("printjob-states-list: GET /printjobs/states, array-of-arrays kept intact", async () => {
  const body = [[{ printJobId: 624, state: "new" }]];
  const { ctx, calls } = mockCtx([{ body }]);
  const out = await states.execute({ limit: 1 }, ctx);
  assertEquals(pathOf(calls[0].url), "/printjobs/states");
  assertEquals(queryOf(calls[0].url), { limit: "1" });
  assertEquals(out, { items: body, count: 1 });
});

test("printjob-states-list: job ids scope the path", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await states.execute({ printJobIds: "623,624" }, ctx);
  assertEquals(pathOf(calls[0].url), "/printjobs/623,624/states");
});

test("printjob-states-list: bad ids refused", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(async () => await states.execute({ printJobIds: "a" }, ctx), Error);
});
