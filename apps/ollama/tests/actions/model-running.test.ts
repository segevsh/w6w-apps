import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import { BASE, display, ok } from "./_shared.ts";
import action from "../../actions/model-running.ts";

test("model-running: reads /api/ps and says whether each model is fully on the GPU", async () => {
  const { ctx, calls } = mockCtx([ok({
    models: [
      { name: "a", size: 100, size_vram: 100, expires_at: "2026-10-22T12:00:00Z" },
      { name: "b", size: 100, size_vram: 40, context_length: 4096 },
    ],
  })], { display });
  const result = await action.execute!({}, ctx) as {
    models: Array<Record<string, unknown>>;
    count: number;
  };
  assertEquals(calls[0].url, `${BASE}/api/ps`);
  assertEquals(result.count, 2);
  assertEquals(result.models[0].fullyOnGpu, true);
  assertEquals(result.models[1].fullyOnGpu, false);
  assertEquals(result.models[1].contextLength, 4096);
});

test("model-running: nothing loaded is an empty list", async () => {
  const { ctx } = mockCtx([ok({ models: [] })], { display });
  assertEquals((await action.execute!({}, ctx) as { count: number }).count, 0);
});
