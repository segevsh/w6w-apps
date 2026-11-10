import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-task.ts";

const task = (id: string) => ({ id: { workspace_id: "w", task_id: id } });
const page = (...ids: string[]) => ({ body: { data: ids.map(task) } });

test("new-task seeds, emits by id.task_id, retries, and requests sort=created_at:desc", async () => {
  const params = {};
  const seed = await trigger.poll!({ params, state: {} }, mockCtx([page("b", "a")]).ctx);
  assertEquals(seed.events, []);
  assertEquals((seed.nextState as { seeded: boolean }).seeded, true);
  const run = () => {
    const c = mockCtx([page("c", "b", "a")]);
    return trigger.poll!({ params, state: seed.nextState }, c.ctx).then((r) => ({ r, c }));
  };
  const first = await run();
  assertEquals(first.r.events, [task("c")]);
  assertEquals((await run()).r, first.r);
  assertEquals(first.c.calls[0].method, "GET");
  assertEquals(
    first.c.calls[0].url,
    "https://api.attio.com/v2/tasks?sort=created_at%3Adesc&limit=50",
  );
});
