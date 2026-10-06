import { assertEquals, assertRejects } from "@std/assert";
import customerGet from "../../actions/customer-get.ts";
import { detailBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("customer-get: GET /customers/42/ with the documented query and body", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "success": true, "customer": { "id": 42, "name": "Ana" } },
  }]);
  const out = await customerGet.execute({ "customerId": 42 } as never, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/customers/42/");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(calls[0].headers["authorization"], undefined, "credentials belong to sign");
  assertEquals(out, { "id": 42, "name": "Ana" });
});

Deno.test("customer-get: a Landbot error surfaces its status and message", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { errors: { detail: ["nope"] } } }]);
  const err = await assertRejects(
    () => Promise.resolve(customerGet.execute({ "customerId": 42 } as never, ctx)),
    Error,
  );
  assertEquals(err.message.includes("403"), true, err.message);
  assertEquals(err.message.includes("detail: nope"), true, err.message);
});

Deno.test("customer-get: declares read", () => {
  assertEquals(customerGet.type, "read");
  assertEquals(detailBody("x"), { detail: "x" });
});
