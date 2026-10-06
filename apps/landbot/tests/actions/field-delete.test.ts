import { assertEquals, assertRejects } from "@std/assert";
import fieldDelete from "../../actions/field-delete.ts";
import { detailBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("field-delete: DELETE /customers/42/fields/plan/ with the documented query and body", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await fieldDelete.execute({ "customerId": 42, "fieldName": "plan" } as never, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v1/customers/42/fields/plan/");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(calls[0].headers["authorization"], undefined, "credentials belong to sign");
  assertEquals(out, { "ok": true });
});

Deno.test("field-delete: a Landbot error surfaces its status and message", async () => {
  const { ctx } = mockCtx([{ status: 412, body: { errors: { detail: ["nope"] } } }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(fieldDelete.execute({ "customerId": 42, "fieldName": "plan" } as never, ctx)),
    Error,
  );
  assertEquals(err.message.includes("412"), true, err.message);
  assertEquals(err.message.includes("detail: nope"), true, err.message);
});

Deno.test("field-delete: declares perform", () => {
  assertEquals(fieldDelete.type, "perform");
  assertEquals(detailBody("x"), { detail: "x" });
});
