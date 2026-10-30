import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import assistantGet from "../../actions/assistant-get.ts";
import { mockCtx, ok, pathOf, queryOf } from "../_helpers.ts";

const PAGE = { total_records: 1, limit: 20, offset: 0 };

test("assistant-get: GET /assistants/{id} and unwraps the one-element array", async () => {
  const { ctx, calls } = mockCtx([{
    body: ok({ pagination: PAGE, assistants: [{ model_id: "a/1" }] }),
  }]);
  const out = await assistantGet.execute({ model_id: "a/1", include_actions: true }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/assistants/a%2F1");
  assertEquals(queryOf(calls[0].url), { include_actions: "true" });
  assertEquals(out, { assistant: { model_id: "a/1" } });
});

test("assistant-get: an empty array is null, not an exception", async () => {
  const { ctx } = mockCtx([{ body: ok({ assistants: [] }) }]);
  assertEquals(await assistantGet.execute({ model_id: "x" }, ctx), { assistant: null });
});
