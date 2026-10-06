import { assertEquals, assertRejects } from "@std/assert";
import invoiceUpdate from "../../actions/invoice-update.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("invoice-update: PUT /invoices/{invoiceId} with the documented query and body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { "id": 1, "name": "x" } }]);
  const out = await invoiceUpdate.execute({
    "invoiceId": 11903,
    "publicId": "1020",
    "dueDate": "2019-03-20",
    "invoiceItems": '[{"id":52,"name":"Dev","taxable":true}]',
  }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/invoices/11903");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "publicId": "1020",
    "dueDate": "2019-03-20",
    "invoiceItems": [{ "id": 52, "name": "Dev", "taxable": true }],
  });
  assertEquals(calls[0].headers["x-accept-version"], "1.2");
  assertEquals(
    calls[0].headers["x-api-key"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals(out, { "id": 1, "name": "x" });
});

Deno.test("invoice-update: an Everhour error surfaces its message and status", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody(404, "Not found") }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        invoiceUpdate.execute({
          "invoiceId": 11903,
          "publicId": "1020",
          "dueDate": "2019-03-20",
          "invoiceItems": '[{"id":52,"name":"Dev","taxable":true}]',
        }, ctx),
      ),
    Error,
  );
  assertEquals(err.message.includes("404"), true, err.message);
  assertEquals(err.message.includes("Not found"), true, err.message);
});

Deno.test("invoice-update: declares perform and idempotent=true", () => {
  assertEquals(invoiceUpdate.type, "perform");
  assertEquals(invoiceUpdate.idempotent, true);
});
