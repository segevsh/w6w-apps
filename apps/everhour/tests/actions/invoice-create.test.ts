import { assertEquals, assertRejects } from "@std/assert";
import invoiceCreate from "../../actions/invoice-create.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("invoice-create: POST /clients/{clientId}/invoices with the documented query and body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { "id": 1, "name": "x" } }]);
  const out = await invoiceCreate.execute({
    "clientId": 107,
    "limitDateFrom": "2019-03-11",
    "limitDateTill": "2019-03-13",
    "includeTime": true,
    "projects": "gh:63301595",
    "tax": '{"rate": 11}',
    "discount": { "rate": 25 },
  }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/clients/107/invoices");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "limitDateFrom": "2019-03-11",
    "limitDateTill": "2019-03-13",
    "includeTime": true,
    "projects": ["gh:63301595"],
    "tax": { "rate": 11 },
    "discount": { "rate": 25 },
  });
  assertEquals(calls[0].headers["x-accept-version"], "1.2");
  assertEquals(
    calls[0].headers["x-api-key"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals(out, { "id": 1, "name": "x" });
});

Deno.test("invoice-create: an Everhour error surfaces its message and status", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody(404, "Not found") }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        invoiceCreate.execute({
          "clientId": 107,
          "limitDateFrom": "2019-03-11",
          "limitDateTill": "2019-03-13",
          "includeTime": true,
          "projects": "gh:63301595",
          "tax": '{"rate": 11}',
          "discount": { "rate": 25 },
        }, ctx),
      ),
    Error,
  );
  assertEquals(err.message.includes("404"), true, err.message);
  assertEquals(err.message.includes("Not found"), true, err.message);
});

Deno.test("invoice-create: declares perform and idempotent=false", () => {
  assertEquals(invoiceCreate.type, "perform");
  assertEquals(invoiceCreate.idempotent, false);
});
