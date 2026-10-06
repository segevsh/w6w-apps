import { assertEquals } from "@std/assert";
import batchCallListRecipients from "../../actions/batch-call-list-recipients.ts";
import { mockCtx, ok, pathOf, queryOf } from "../_helpers.ts";

const PAGE = { total_records: 1, limit: 20, offset: 0 };

Deno.test("batch-call-list-recipients: GET /calls/batch/{id}/tasks -> tasks, with status filter", async () => {
  const { ctx, calls } = mockCtx([{ body: ok({ pagination: PAGE, tasks: [{ id: "t1" }] }) }]);
  const out = await batchCallListRecipients.execute({ batch_call_id: "b1", status: "failed" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/calls/batch/b1/tasks");
  assertEquals(queryOf(calls[0].url), { status: "failed" });
  assertEquals(out, { items: [{ id: "t1" }], pagination: PAGE });
});
