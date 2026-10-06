import { assertEquals, assertRejects } from "@std/assert";
import invoiceGet from "../../actions/invoice-get.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("invoice-get: GET /invoices/{id} flattens the resource", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "data": { "id": "42", "type": "invoices", "attributes": { "name": "x" } } },
  }]);
  const out = await invoiceGet.execute({ id: "42", include: "project" }, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v2/invoices/42");
  assertEquals(queryOf(calls[0].url), { include: "project" });
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers["x-auth-token"], undefined, "credentials belong to sign");
  assertEquals(out.id, "42");
  assertEquals(out.type, "invoices");
  assertEquals(out.name, "x");
});

Deno.test("invoice-get: an id cannot change the path", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "data": { "id": "42", "type": "invoices", "attributes": { "name": "x" } } },
  }]);
  await invoiceGet.execute({ id: "4/../x" }, ctx);
  assertEquals(new URL(calls[0].url).pathname.startsWith("/api/v2/invoices/"), true);
  assertEquals(pathOf(calls[0].url), "/api/v2/invoices/4%2F..%2Fx");
});

Deno.test("invoice-get: a vendor error surfaces its status, title and detail", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: errorBody("404", "not_found", "Not Found", "Resource not found"),
  }]);
  const err = await assertRejects(
    () => Promise.resolve(invoiceGet.execute({ id: "42" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("404"), true, err.message);
  assertEquals(err.message.includes("Resource not found"), true, err.message);
});

Deno.test("invoice-get: declares read", () => {
  assertEquals(invoiceGet.type, "read");
  assertEquals(invoiceGet.idempotent, undefined);
  assertEquals(invoiceGet.key, "invoice-get");
});
