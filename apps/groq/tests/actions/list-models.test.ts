import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-models.ts";

test("list-models: GETs /openai/v1/models", async () => {
  const body = { object: "list", data: [{ id: "llama-3.3-70b-versatile" }] };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/openai/v1/models");
  assertEquals(result, body);
});
