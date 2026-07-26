import { assertEquals } from "@std/assert";
import { mockSalesforceCtx } from "../_helpers.ts";
import action from "../../actions/record-get.ts";

Deno.test("record-get: GETs the record by id", async () => {
  const { ctx, calls } = mockSalesforceCtx([{ body: { Id: "00Q1" } }]);
  await action.execute({ sobject: "Lead", recordId: "00Q1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/services/data/v60.0/sobjects/Lead/00Q1");
});

Deno.test("record-get: narrows the columns when a field list is given", async () => {
  const { ctx, calls } = mockSalesforceCtx([{ body: {} }]);
  await action.execute({ sobject: "Lead", recordId: "00Q1", fields: "Id,Email" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("fields"), "Id,Email");
});
