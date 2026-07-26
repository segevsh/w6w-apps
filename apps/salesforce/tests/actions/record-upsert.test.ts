import { assertEquals, assertThrows } from "@std/assert";
import { mockSalesforceCtx } from "../_helpers.ts";
import action from "../../actions/record-upsert.ts";

Deno.test("record-upsert: PATCHes the external-id route", async () => {
  const { ctx, calls } = mockSalesforceCtx([{ body: { id: "00Q1", created: true } }]);
  await action.execute(
    {
      sobject: "Lead",
      externalIdField: "Legacy_Id__c",
      externalId: "ABC-1",
      fields: { LastName: "Smith" },
    },
    ctx,
  );
  assertEquals(calls[0].method, "PATCH");
  assertEquals(
    new URL(calls[0].url).pathname,
    "/services/data/v60.0/sobjects/Lead/Legacy_Id__c/ABC-1",
  );
  assertEquals(JSON.parse(calls[0].body!), { LastName: "Smith" });
});

Deno.test("record-upsert: percent-encodes the external id value", async () => {
  const { ctx, calls } = mockSalesforceCtx([{ body: {} }]);
  await action.execute(
    { sobject: "Lead", externalIdField: "Legacy_Id__c", externalId: "A/B", fields: { x: 1 } },
    ctx,
  );
  assertEquals(
    new URL(calls[0].url).pathname,
    "/services/data/v60.0/sobjects/Lead/Legacy_Id__c/A%2FB",
  );
});

Deno.test("record-upsert: validates the external-id FIELD name too", () => {
  const { ctx } = mockSalesforceCtx();
  assertThrows(
    () =>
      action.execute(
        { sobject: "Lead", externalIdField: "../x", externalId: "1", fields: { a: 1 } },
        ctx,
      ),
    Error,
    "not a valid Salesforce object name",
  );
});

Deno.test("record-upsert: is the idempotent counterpart to record-create", () => {
  assertEquals(action.idempotent, true);
});
