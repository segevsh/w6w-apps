import { assertEquals, assertRejects } from "@std/assert";
import customerAssign from "../../actions/customer-assign.ts";
import { detailBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("customer-assign: PUT /customers/42/assign/ with the documented query and body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  const out = await customerAssign.execute({ "customerId": 42 } as never, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v1/customers/42/assign/");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(calls[0].headers["authorization"], undefined, "credentials belong to sign");
  assertEquals(out, { "ok": true });
});

Deno.test("customer-assign: a Landbot error surfaces its status and message", async () => {
  const { ctx } = mockCtx([{ status: 412, body: { errors: { detail: ["nope"] } } }]);
  const err = await assertRejects(
    () => Promise.resolve(customerAssign.execute({ "customerId": 42 } as never, ctx)),
    Error,
  );
  assertEquals(err.message.includes("412"), true, err.message);
  assertEquals(err.message.includes("detail: nope"), true, err.message);
});

Deno.test("customer-assign: declares perform", () => {
  assertEquals(customerAssign.type, "perform");
  assertEquals(detailBody("x"), { detail: "x" });
});
