import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx, resultEnvelope } from "../_helpers.ts";
import trigger from "../../triggers/new-task.ts";

const response = (items: unknown[]) => ({ body: resultEnvelope({ robotTasks: { items } }) });

test("new-task seeds, emits, retries, and requests the bounded newest-first task page", async () => {
  const params = { robotId: "r1" };
  const seed = await trigger.poll!({ params, state: {} }, mockCtx([response([{ id: "a" }])]).ctx);
  assertEquals(seed.events, []);
  const nextCtx = mockCtx([response([{ id: "b" }, { id: "a" }])]);
  const next = await trigger.poll!({ params, state: seed.nextState }, nextCtx.ctx);
  assertEquals(next.events, [{ id: "b" }]);
  const retry = await trigger.poll!(
    { params, state: seed.nextState },
    mockCtx([response([{ id: "b" }, { id: "a" }])]).ctx,
  );
  assertEquals(retry, next);
  assertEquals(nextCtx.calls[0].url, "https://api.browse.ai/v2/robots/r1/tasks?page=1&pageSize=10");
});
