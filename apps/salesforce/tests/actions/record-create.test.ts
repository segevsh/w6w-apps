import { assertEquals, assertThrows } from "@std/assert";
import { mockSalesforceCtx } from "../_helpers.ts";
import action from "../../actions/record-create.ts";

Deno.test("record-create: POSTs the fields to /sobjects/{type}", async () => {
  const { ctx, calls } = mockSalesforceCtx([{ body: { id: "00Q1", success: true } }]);
  await action.execute({ sobject: "Lead", fields: { LastName: "Smith", Company: "Acme" } }, ctx);
  assertEquals(
    calls[0].url,
    "https://acme.my.salesforce.com/services/data/v60.0/sobjects/Lead",
  );
  assertEquals(JSON.parse(calls[0].body!), { LastName: "Smith", Company: "Acme" });
});

Deno.test("record-create: works the same for a custom object", async () => {
  const { ctx, calls } = mockSalesforceCtx([{ body: {} }]);
  await action.execute({ sobject: "Invoice__c", fields: { Name: "INV-1" } }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/services/data/v60.0/sobjects/Invoice__c");
});

Deno.test("record-create: rejects a path-escaping object name before any request", () => {
  const { ctx, calls } = mockSalesforceCtx();
  assertThrows(
    () => action.execute({ sobject: "../limits", fields: { a: 1 } }, ctx),
    Error,
    "not a valid Salesforce object name",
  );
  assertEquals(calls.length, 0);
});

Deno.test("record-create: points at record-upsert for retry-safety", () => {
  assertEquals(action.idempotent, false);
});
