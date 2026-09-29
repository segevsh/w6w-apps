import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  formatAnalyticsError,
  organizationIdFrom,
  parseJsonObject,
  ZohoAnalyticsClient,
} from "../../lib/client.ts";
import { mockAnalyticsCtx, mockCtx } from "../_helpers.ts";

Deno.test("formatAnalyticsError: uses the vendor's summary/errorCode/errorMessage when present", () => {
  const msg = formatAnalyticsError(
    400,
    "GET",
    "/restapi/v2/workspaces/owned",
    JSON.stringify({
      status: "failure",
      summary: "INVALID_TICKET",
      data: { errorCode: 8518, errorMessage: "You need to (re)login to perform this operation" },
    }),
  );
  assert(msg.includes("INVALID_TICKET"));
  assert(msg.includes("8518"));
  assert(msg.includes("You need to (re)login to perform this operation"));
});

Deno.test("formatAnalyticsError: falls back to the raw body when it is not the documented shape", () => {
  const msg = formatAnalyticsError(500, "GET", "/x", "<html>upstream exploded</html>");
  assert(msg.includes("500"));
  assert(msg.includes("upstream exploded"));
});

Deno.test("organizationIdFrom: prefers an explicit input over the connection default", () => {
  const { ctx } = mockAnalyticsCtx([], "analyticsapi.zoho.com", "671712892");
  assertEquals(organizationIdFrom({ organizationId: "999" }, ctx), "999");
});

Deno.test("organizationIdFrom: falls back to the connection's recorded organizationId", () => {
  const { ctx } = mockAnalyticsCtx([], "analyticsapi.zoho.com", "671712892");
  assertEquals(organizationIdFrom({}, ctx), "671712892");
});

Deno.test("organizationIdFrom: throws a clear error when neither is available", () => {
  const { ctx } = mockCtx([]);
  assertThrows(() => organizationIdFrom({}, ctx), Error, "List Owned Workspaces");
});

Deno.test("parseJsonObject: parses a JSON string and passes through an object", () => {
  assertEquals(parseJsonObject('{"a":1}', "columns"), { a: 1 });
  assertEquals(parseJsonObject({ a: 1 }, "columns"), { a: 1 });
});

Deno.test("parseJsonObject: rejects missing/empty/array input", () => {
  assertThrows(() => parseJsonObject(undefined, "columns"), Error, "required");
  assertThrows(() => parseJsonObject([1, 2], "columns"), Error, "JSON object");
});

Deno.test("ZohoAnalyticsClient#request: encodes CONFIG into the query string and unwraps `data`", async () => {
  const { ctx, calls } = mockAnalyticsCtx([
    { body: { status: "success", summary: "Add row", data: { addedColumns: { a: "1" } } } },
  ]);
  const out = await new ZohoAnalyticsClient(ctx).request("/workspaces/1/views/2/rows", {
    method: "POST",
    config: { columns: { a: "1" } },
    organizationId: "671712892",
  });
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/restapi/v2/workspaces/1/views/2/rows");
  assertEquals(JSON.parse(url.searchParams.get("CONFIG")!), { columns: { a: "1" } });
  assertEquals(calls[0].headers["zanalytics-orgid"], "671712892");
  assertEquals(out, { addedColumns: { a: "1" } });
});

Deno.test("ZohoAnalyticsClient#request: sends no org header when none is given", async () => {
  const { ctx, calls } = mockAnalyticsCtx([
    { body: { status: "success", summary: "ok", data: { workspaces: [] } } },
  ]);
  await new ZohoAnalyticsClient(ctx).request("/workspaces/owned");
  assertEquals(calls[0].headers["zanalytics-orgid"], undefined);
});

Deno.test("ZohoAnalyticsClient#request: throws the formatted error on a non-ok response", async () => {
  const { ctx } = mockAnalyticsCtx([
    {
      status: 401,
      body: {
        status: "failure",
        summary: "INVALID_OAUTHTOKEN",
        data: { errorCode: 8535, errorMessage: "Invalid Oauthtoken" },
      },
    },
  ]);
  await assertRejects(
    () => new ZohoAnalyticsClient(ctx).request("/workspaces/owned"),
    Error,
    "INVALID_OAUTHTOKEN",
  );
});

Deno.test("ZohoAnalyticsClient#requestRaw: returns text content as-is for a text content type", async () => {
  const { ctx, calls } = mockAnalyticsCtx([
    {
      status: 200,
      headers: { "content-type": "text/csv;charset=UTF-8" },
      body: "Region,Sales\nEast,100\n",
    },
  ]);
  const out = await new ZohoAnalyticsClient(ctx).requestRaw("/workspaces/1/views/2/data", {
    config: { responseFormat: "csv" },
    organizationId: "671712892",
  });
  assertEquals(out.base64, false);
  assertEquals(out.content, "Region,Sales\nEast,100\n");
  assertEquals(out.contentType, "text/csv;charset=UTF-8");
  assertEquals(calls[0].headers["zanalytics-orgid"], "671712892");
});

Deno.test("ZohoAnalyticsClient#requestRaw: base64-encodes a binary content type", async () => {
  const { ctx } = mockAnalyticsCtx([
    { status: 200, headers: { "content-type": "image/png" }, body: "\x89PNG\r\n" },
  ]);
  const out = await new ZohoAnalyticsClient(ctx).requestRaw("/workspaces/1/views/2/data", {
    config: { responseFormat: "image" },
  });
  assertEquals(out.base64, true);
  assertEquals(out.contentType, "image/png");
  assert(out.content.length > 0);
});

Deno.test("ZohoAnalyticsClient#requestRaw: throws the formatted error on a non-ok response", async () => {
  const { ctx } = mockAnalyticsCtx([
    {
      status: 400,
      body: {
        status: "failure",
        summary: "INVALID_TICKET",
        data: { errorCode: 8518, errorMessage: "You need to (re)login to perform this operation" },
      },
    },
  ]);
  await assertRejects(
    () =>
      new ZohoAnalyticsClient(ctx).requestRaw("/workspaces/1/views/2/data", {
        config: { responseFormat: "csv" },
      }),
    Error,
    "INVALID_TICKET",
  );
});
