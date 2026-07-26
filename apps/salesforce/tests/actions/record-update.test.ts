import { assert, assertEquals } from "@std/assert";
import { mockSalesforceCtx } from "../_helpers.ts";
import action from "../../actions/record-update.ts";

Deno.test("record-update: PATCHes the supplied fields", async () => {
  const { ctx, calls } = mockSalesforceCtx([{ status: 204 }]);
  await action.execute({ sobject: "Lead", recordId: "00Q1", fields: { Status: "Working" } }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), { Status: "Working" });
});

Deno.test("record-update: says plainly that Salesforce returns no body", () => {
  assert(action.description?.includes("204"));
});
