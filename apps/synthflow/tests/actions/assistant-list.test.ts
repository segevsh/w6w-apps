import { assertEquals } from "@std/assert";
import assistantList from "../../actions/assistant-list.ts";
import { mockCtx, ok, pathOf, queryOf } from "../_helpers.ts";

const PAGE = { total_records: 1, limit: 20, offset: 0 };

Deno.test("assistant-list: GET /assistants/ with limit/offset, returns items + pagination", async () => {
  const { ctx, calls } = mockCtx([{
    body: ok({ pagination: PAGE, assistants: [{ model_id: "a1" }] }),
  }]);
  const out = await assistantList.execute({ limit: 5, offset: 10 }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/assistants/");
  assertEquals(queryOf(calls[0].url), { limit: "5", offset: "10" });
  assertEquals(out, { items: [{ model_id: "a1" }], pagination: PAGE });
});
