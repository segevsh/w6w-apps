import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockCtx, mockSalesforceCtx } from "../_helpers.ts";
import {
  fields,
  instanceFromConnection,
  SalesforceClient,
  sobjectName,
  unset,
} from "../../lib/client.ts";

Deno.test("client: builds the versioned data path under the org's own host", async () => {
  const { ctx, calls } = mockSalesforceCtx([{ body: { Id: "001" } }]);
  await new SalesforceClient(ctx).request("/sobjects/Lead/001");
  assertEquals(
    calls[0].url,
    "https://acme.my.salesforce.com/services/data/v60.0/sobjects/Lead/001",
  );
  assertEquals("authorization" in calls[0].headers, false);
});

Deno.test("client: absolutePath bypasses the data path for query locators", async () => {
  const { ctx, calls } = mockSalesforceCtx([{ body: {} }]);
  await new SalesforceClient(ctx).request("/services/data/v60.0/query/01g-2000", {
    absolutePath: true,
  });
  assertEquals(
    calls[0].url,
    "https://acme.my.salesforce.com/services/data/v60.0/query/01g-2000",
  );
});

Deno.test("client: fails loudly when the connection has no instance URL", () => {
  const { ctx } = mockCtx();
  assertThrows(() => new SalesforceClient(ctx), Error, "no instance URL");
});

Deno.test("client: flattens Salesforce's error ARRAY, keeping code and fields", async () => {
  const { ctx } = mockSalesforceCtx([{
    status: 400,
    body:
      '[{"message":"Required fields are missing: [Company]","errorCode":"REQUIRED_FIELD_MISSING","fields":["Company"]}]',
  }]);
  await assertRejects(
    () => new SalesforceClient(ctx).request("/sobjects/Lead", { method: "POST", body: {} }),
    Error,
    "REQUIRED_FIELD_MISSING Required fields are missing: [Company] [Company]",
  );
});

Deno.test("client: returns undefined for the empty 204 body of update/delete", async () => {
  const { ctx } = mockSalesforceCtx([{ status: 204 }]);
  assertEquals(
    await new SalesforceClient(ctx).request("/sobjects/Lead/001", { method: "DELETE" }),
    undefined,
  );
});

Deno.test("instanceFromConnection: strips a trailing slash", () => {
  assertEquals(
    instanceFromConnection(
      { display: { instanceUrl: "https://acme.my.salesforce.com/" } } as never,
    ),
    "https://acme.my.salesforce.com",
  );
});

Deno.test("sobjectName: rejects anything that is not an identifier", () => {
  assertEquals(sobjectName("Invoice__c"), "Invoice__c");
  // Object names go straight into a URL path, so they are validated, not encoded.
  assertThrows(() => sobjectName("../limits"), Error, "not a valid Salesforce object name");
  assertThrows(() => sobjectName("Lead;drop"), Error, "not a valid Salesforce object name");
});

Deno.test("fields: parses a JSON string and rejects non-objects", () => {
  assertEquals(fields('{"LastName":"Smith"}'), { LastName: "Smith" });
  assertEquals(fields({ a: 1 }), { a: 1 });
  assertThrows(() => fields(""), Error, "is required");
  assertThrows(() => fields("[1]"), Error, "must be a JSON object");
});

Deno.test("unset: a blank form field is absent", () => {
  assertEquals(unset(""), undefined);
});
