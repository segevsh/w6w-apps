import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockCtx, mockZohoCtx } from "../_helpers.ts";
import {
  apiDomainFromConnection,
  DEFAULT_API_DOMAIN,
  fields,
  moduleName,
  unwrapRecordResult,
  ZohoClient,
} from "../../lib/client.ts";

Deno.test("apiDomainFromConnection: falls back to the US host when the connection has none", () => {
  assertEquals(apiDomainFromConnection(undefined), DEFAULT_API_DOMAIN);
  assertEquals(
    apiDomainFromConnection(
      { id: "c", app: "a", auth: "oauth2", status: "live", display: {} } as never,
    ),
    DEFAULT_API_DOMAIN,
  );
});

Deno.test("apiDomainFromConnection: reads the recorded regional host and trims trailing slashes", () => {
  const connection = {
    id: "c",
    app: "a",
    auth: "oauth2",
    status: "live",
    display: { apiDomain: "https://www.zohoapis.eu/" },
  } as never;
  assertEquals(apiDomainFromConnection(connection), "https://www.zohoapis.eu");
});

Deno.test("moduleName: accepts a plain identifier, rejects a path-escaping value", () => {
  assertEquals(moduleName("Leads"), "Leads");
  assertEquals(moduleName("Invoices__c"), "Invoices__c");
  assertThrows(() => moduleName("../org"), Error, "not a valid Zoho CRM module API name");
});

Deno.test("fields: requires an object and rejects blanks", () => {
  assertEquals(fields({ Last_Name: "Smith" }), { Last_Name: "Smith" });
  assertEquals(fields('{"Last_Name":"Smith"}'), { Last_Name: "Smith" });
  assertThrows(() => fields(undefined), Error, "required");
  assertThrows(() => fields([1, 2]), Error, "must be a JSON object");
});

Deno.test("unwrapRecordResult: returns the single entry on success", () => {
  const entry = unwrapRecordResult({
    data: [{ code: "SUCCESS", status: "success", message: "record added" }],
  });
  assertEquals(entry.code, "SUCCESS");
});

Deno.test("unwrapRecordResult: throws on a per-item error even with an otherwise-2xx response", () => {
  assertThrows(
    () =>
      unwrapRecordResult({
        data: [{ code: "MANDATORY_NOT_FOUND", status: "error", message: "Last_Name required" }],
      }),
    Error,
    "MANDATORY_NOT_FOUND: Last_Name required",
  );
});

Deno.test("unwrapRecordResult: throws when the response carries no entry", () => {
  assertThrows(() => unwrapRecordResult({}), Error, "no result entry");
});

Deno.test("ZohoClient: builds the versioned URL against the connection's regional host", async () => {
  const { ctx, calls } = mockZohoCtx([{ body: { data: [] } }], "https://www.zohoapis.eu");
  await new ZohoClient(ctx).request("/Leads");
  assertEquals(calls[0].url, "https://www.zohoapis.eu/crm/v6/Leads");
});

Deno.test("ZohoClient: surfaces code + message from a request-level error body", async () => {
  const { ctx } = mockZohoCtx([
    {
      status: 401,
      body: { code: "INVALID_TOKEN", message: "invalid oauth token", status: "error" },
    },
  ]);
  await assertRejects(
    () => new ZohoClient(ctx).request("/Leads"),
    Error,
    "INVALID_TOKEN invalid oauth token",
  );
});

Deno.test("ZohoClient: never sets Authorization itself", async () => {
  const { ctx, calls } = mockZohoCtx([{ body: { data: [] } }]);
  await new ZohoClient(ctx).request("/Leads");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("mockCtx sanity: fetch is required for the sandbox contract", () => {
  const { ctx } = mockCtx();
  assertEquals(typeof ctx.fetch, "function");
});
