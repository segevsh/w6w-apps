import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import { BASE, ok } from "./_shared.ts";
import action from "../../actions/model-list.ts";

test("model-list: reads /api/tags and flattens the details", async () => {
  const { ctx, calls } = mockCtx([ok({
    models: [{
      name: "llama3.2:3b",
      model: "llama3.2:3b",
      size: 2019393189,
      digest: "abc",
      modified_at: "2026-09-26T03:16:59Z",
      details: { family: "llama", parameter_size: "3.2B", quantization_level: "Q4_K_M" },
      capabilities: ["completion", "tools"],
    }],
  })]);
  const result = await action.execute!({}, ctx) as {
    models: Array<Record<string, unknown>>;
    count: number;
    names: string[];
  };
  assertEquals(calls[0].url, `${BASE}/api/tags`);
  assertEquals(calls[0].method, "GET");
  assertEquals(result.count, 1);
  assertEquals(result.names, ["llama3.2:3b"]);
  assertEquals(result.models[0].family, "llama");
  assertEquals(result.models[0].parameterSize, "3.2B");
  assertEquals(result.models[0].sizeBytes, 2019393189);
});

test("model-list: an account with no models is an empty list, not an error", async () => {
  const { ctx } = mockCtx([ok({ models: [] })]);
  const result = await action.execute!({}, ctx) as { count: number };
  assertEquals(result.count, 0);
});
