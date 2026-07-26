import { assert, assertEquals } from "@std/assert";
import { mockSalesforceCtx } from "../_helpers.ts";
import action from "../../actions/record-delete.ts";

Deno.test("record-delete: DELETEs the record", async () => {
  const { ctx, calls } = mockSalesforceCtx([{ status: 204 }]);
  await action.execute({ sobject: "Lead", recordId: "00Q1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/services/data/v60.0/sobjects/Lead/00Q1");
});

Deno.test("record-delete: notes that the record is recoverable", () => {
  assert(action.description?.includes("Recycle Bin"));
});
