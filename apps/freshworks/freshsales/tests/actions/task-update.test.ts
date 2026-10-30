import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockFreshsalesCtx } from "../_helpers.ts";
import action from "../../actions/task-update.ts";

test("task-update: PUTs to /tasks/:id with only the set fields", async () => {
  const { ctx, calls } = mockFreshsalesCtx([{ body: { task: { id: 1 } } }]);
  const out = await action.execute({ taskId: 1, title: "Updated" }, ctx);
  assertEquals(calls[0].url, "https://acme.myfreshworks.com/crm/sales/api/tasks/1");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { task: { title: "Updated" } });
  assertEquals(out, { id: 1 });
});

test("task-update: markDone sends the docs' status:1 body verbatim", async () => {
  const { ctx, calls } = mockFreshsalesCtx([{ body: { task: { id: 1, status: 1 } } }]);
  await action.execute({ taskId: 1, markDone: true }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { task: { status: 1 } });
});

test("task-update: markDone:false sends no status field at all", async () => {
  const { ctx, calls } = mockFreshsalesCtx([{ body: { task: {} } }]);
  await action.execute({ taskId: 1, markDone: false }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { task: {} });
});
