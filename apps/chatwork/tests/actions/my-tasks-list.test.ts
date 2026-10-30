import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import myTasksList from "../../actions/my-tasks-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

test("my-tasks-list: passes assignedByAccountId and status through as query params", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await myTasksList.execute({ assignedByAccountId: 78, status: "open" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/my/tasks");
  assertEquals(queryOf(calls[0].url), { assigned_by_account_id: "78", status: "open" });
});

test("my-tasks-list: a 204 (nothing assigned) normalises to an empty array", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  const out = await myTasksList.execute({}, ctx);
  assertEquals(out, []);
});

test("my-tasks-list: omits params entirely when neither filter is given", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await myTasksList.execute({}, ctx);
  assertEquals(queryOf(calls[0].url), {});
});
