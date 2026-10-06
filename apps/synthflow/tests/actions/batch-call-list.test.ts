import { assertEquals } from "@std/assert";
import batchCallList from "../../actions/batch-call-list.ts";
import { mockCtx, ok, pathOf, queryOf } from "../_helpers.ts";

const PAGE = { total_records: 1, limit: 20, offset: 0 };

Deno.test("batch-call-list: GET /calls/batch -> batch_calls", async () => {
  const { ctx, calls } = mockCtx([{
    body: ok({ pagination: PAGE, batch_calls: [{ batch_call_id: "b1" }] }),
  }]);
  const out = await batchCallList.execute({ limit: 100 }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/calls/batch");
  assertEquals(queryOf(calls[0].url), { limit: "100" });
  assertEquals(out, { items: [{ batch_call_id: "b1" }], pagination: PAGE });
});
