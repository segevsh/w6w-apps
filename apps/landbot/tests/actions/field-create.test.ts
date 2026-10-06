import { assertEquals, assertRejects } from "@std/assert";
import fieldCreate from "../../actions/field-create.ts";
import { detailBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("field-create: POST /customers/42/fields/age/ with the documented query and body", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "success": true, "field": { "name": "age", "type": "integer", "value": 31 } },
  }]);
  const out = await fieldCreate.execute(
    {
      "customerId": 42,
      "fieldName": "age",
      "type": "integer",
      "value": "31",
      "extra": '{"unit":"y"}',
    } as never,
    ctx,
  );

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/customers/42/fields/age/");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "type": "integer",
    "value": 31,
    "extra": { "unit": "y" },
  });
  assertEquals(calls[0].headers["authorization"], undefined, "credentials belong to sign");
  assertEquals(out, { "name": "age", "type": "integer", "value": 31 });
});

Deno.test("field-create: a Landbot error surfaces its status and message", async () => {
  const { ctx } = mockCtx([{ status: 412, body: { errors: { detail: ["nope"] } } }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        fieldCreate.execute(
          {
            "customerId": 42,
            "fieldName": "age",
            "type": "integer",
            "value": "31",
            "extra": '{"unit":"y"}',
          } as never,
          ctx,
        ),
      ),
    Error,
  );
  assertEquals(err.message.includes("412"), true, err.message);
  assertEquals(err.message.includes("detail: nope"), true, err.message);
});

Deno.test("field-create: declares perform", () => {
  assertEquals(fieldCreate.type, "perform");
  assertEquals(detailBody("x"), { detail: "x" });
});
