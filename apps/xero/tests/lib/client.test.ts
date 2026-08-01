import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { compact, jsonArray, jsonObject, unset, XeroClient } from "../../lib/client.ts";

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
  assertEquals(jsonArray("[1,2]", "lineItems"), [1, 2]);
  assertEquals(jsonArray([1, 2], "lineItems"), [1, 2]);
});

Deno.test("jsonArray: rejects a non-array", () => {
  assertThrows(() => jsonArray({ a: 1 }, "lineItems"), Error, "must be a JSON array");
});

Deno.test("XeroClient: builds the request against the fixed API host, no auth headers", async () => {
  const { ctx, calls } = mockCtx([{ body: { Contacts: [] } }]);
  await new XeroClient(ctx).request("/Contacts", { query: { page: 1 } });
  assertEquals(calls[0].url, "https://api.xero.com/api.xro/2.0/Contacts?page=1");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].headers["xero-tenant-id"], undefined);
});

Deno.test("XeroClient: surfaces nested ValidationErrors on a non-ok response", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: {
      Type: "ValidationException",
      Message: "A validation exception occurred",
      Elements: [{ ValidationErrors: [{ Message: "AccountCode must be specified" }] }],
    },
  }]);
  await assertRejects(
    () => new XeroClient(ctx).request("/Invoices", { method: "POST", body: {} }),
    Error,
    "AccountCode must be specified",
  );
});

Deno.test("XeroClient: falls back to the top-level Message when there are no Elements", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { Message: "Token expired" } }]);
  await assertRejects(
    () => new XeroClient(ctx).request("/Contacts"),
    Error,
    "Token expired",
  );
});

Deno.test("XeroClient: a 204 with no body resolves to undefined", async () => {
  const { ctx } = mockCtx([{ status: 204, body: undefined }]);
  const out = await new XeroClient(ctx).request("/Contacts/c1", { method: "DELETE" });
  assertEquals(out, undefined);
});
