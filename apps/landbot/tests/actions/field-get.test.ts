import { assertEquals, assertRejects } from "@std/assert";
import fieldGet from "../../actions/field-get.ts";
import { detailBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("field-get: GET /customers/42/fields/plan/ with the documented query and body", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "success": true, "field": { "name": "plan", "type": "string", "value": "pro" } },
  }]);
  const out = await fieldGet.execute({ "customerId": 42, "fieldName": "plan" } as never, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/customers/42/fields/plan/");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(calls[0].headers["authorization"], undefined, "credentials belong to sign");
  assertEquals(out, { "name": "plan", "type": "string", "value": "pro" });
});

Deno.test("field-get: a Landbot error surfaces its status and message", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { errors: { detail: ["nope"] } } }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(fieldGet.execute({ "customerId": 42, "fieldName": "plan" } as never, ctx)),
    Error,
  );
  assertEquals(err.message.includes("403"), true, err.message);
  assertEquals(err.message.includes("detail: nope"), true, err.message);
});

Deno.test("field-get: declares read", () => {
  assertEquals(fieldGet.type, "read");
  assertEquals(detailBody("x"), { detail: "x" });
});
