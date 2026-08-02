import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockCtx, mockQuickBooksCtx } from "../_helpers.ts";
import {
  baseFromConnection,
  buildQuery,
  compact,
  jsonArray,
  jsonObject,
  QuickBooksClient,
  unset,
} from "../../lib/client.ts";

Deno.test("unset: treats a blank string as absent", () => {
  assertEquals(unset(""), undefined);
  assertEquals(unset("x"), "x");
});

Deno.test("compact: drops undefined, null and empty-string values", () => {
  assertEquals(compact({ a: 1, b: undefined, c: null, d: "", e: "x" }), { a: 1, e: "x" });
});

Deno.test("jsonObject: parses a JSON string and passes an object through", () => {
  assertEquals(jsonObject('{"a":1}', "fields"), { a: 1 });
  assertEquals(jsonObject({ a: 1 }, "fields"), { a: 1 });
  assertEquals(jsonObject(undefined, "fields"), {});
});

Deno.test("jsonObject: rejects a non-object", () => {
  assertThrows(() => jsonObject([1, 2], "fields"), Error, "must be a JSON object");
});

Deno.test("jsonArray: parses a JSON string and passes an array through", () => {
  assertEquals(jsonArray("[1,2]", "lines"), [1, 2]);
  assertEquals(jsonArray([1, 2], "lines"), [1, 2]);
});

Deno.test("jsonArray: rejects a non-array", () => {
  assertThrows(() => jsonArray({ a: 1 }, "lines"), Error, "must be a JSON array");
});

Deno.test("buildQuery: defaults STARTPOSITION/MAXRESULTS and omits WHERE/ORDERBY when unset", () => {
  assertEquals(buildQuery("Customer"), "SELECT * FROM Customer STARTPOSITION 1 MAXRESULTS 100");
});

Deno.test("buildQuery: includes WHERE/ORDERBY/pagination when provided", () => {
  assertEquals(
    buildQuery("Invoice", {
      where: "Balance > '0'",
      orderBy: "TxnDate DESC",
      startPosition: 101,
      maxResults: 50,
    }),
    "SELECT * FROM Invoice WHERE Balance > '0' ORDERBY TxnDate DESC STARTPOSITION 101 MAXRESULTS 50",
  );
});

Deno.test("baseFromConnection: throws when the connection carries no realmId", () => {
  assertThrows(
    () => baseFromConnection(undefined),
    Error,
    "has no realmId",
  );
  assertThrows(
    () =>
      baseFromConnection(
        { id: "c1", app: "io.w6w.quickbooks", auth: "oauth2", status: "live" } as never,
      ),
    Error,
    "has no realmId",
  );
});

Deno.test("baseFromConnection: builds the company-scoped base URL", () => {
  assertEquals(
    baseFromConnection(
      { id: "c1", app: "io.w6w.quickbooks", auth: "oauth2", status: "live", display: { realmId: "9" } } as never,
    ),
    "https://quickbooks.api.intuit.com/v3/company/9",
  );
});

Deno.test("QuickBooksClient: builds requests against the company-scoped host, pins minorversion, no auth headers", async () => {
  const { ctx, calls } = mockQuickBooksCtx([{ body: { Customer: {} } }]);
  await new QuickBooksClient(ctx).request("/customer/1");
  assertEquals(
    calls[0].url,
    "https://quickbooks.api.intuit.com/v3/company/123145/customer/1?minorversion=75",
  );
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("QuickBooksClient.query: runs a SELECT against /query", async () => {
  const { ctx, calls } = mockQuickBooksCtx([{ body: { QueryResponse: {} } }]);
  await new QuickBooksClient(ctx).query("Vendor", { where: "Active = true" });
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3/company/123145/query");
  assertEquals(
    url.searchParams.get("query"),
    "SELECT * FROM Vendor WHERE Active = true STARTPOSITION 1 MAXRESULTS 100",
  );
});

Deno.test("QuickBooksClient: surfaces nested Fault.Error on a non-ok response", async () => {
  const { ctx } = mockQuickBooksCtx([{
    status: 400,
    body: {
      Fault: {
        Error: [{ Message: "Duplicate Name Exists Error", Detail: "The name supplied already exists.", code: "6240" }],
        type: "ValidationFault",
      },
    },
  }]);
  await assertRejects(
    () => new QuickBooksClient(ctx).request("/customer", { method: "POST", body: {} }),
    Error,
    "Duplicate Name Exists Error",
  );
});

Deno.test("QuickBooksClient: a body-less response resolves to undefined", async () => {
  const { ctx } = mockCtx([{ status: 200, body: undefined }]);
  (ctx as { connection?: unknown }).connection = {
    id: "c1",
    app: "io.w6w.quickbooks",
    auth: "oauth2",
    status: "live",
    display: { realmId: "1" },
  };
  const out = await new QuickBooksClient(ctx).request("/customer/1");
  assertEquals(out, undefined);
});
