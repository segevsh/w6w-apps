import { assertEquals, assertRejects } from "@std/assert";
import customFieldCreate from "../../actions/custom-field-create.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "productId": "productId-1==", "name": "name-1", "required": true };

Deno.test("custom-field-create: sends POST /v2/products/productId-1%3D%3D/custom_fields with the mapped parameters", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "custom_field": { "id": "x1", "marker": true } },
  }]);
  await customFieldCreate.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/products/productId-1%3D%3D/custom_fields");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals([...new URLSearchParams(calls[0].body ?? "")], [["name", "name-1"], [
    "required",
    "true",
  ]]);
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
});

Deno.test("custom-field-create: returns the documented result shape", async () => {
  const { ctx } = mockCtx([{
    body: { "success": true, "custom_field": { "id": "x1", "marker": true } },
  }]);
  assertEquals(await customFieldCreate.execute(INPUT, ctx), { "id": "x1", "marker": true });
});

Deno.test("custom-field-create: a 404 surfaces Gumroad's own message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { success: false, message: "The thing could not be found." },
  }]);
  const err = await assertRejects(
    () => Promise.resolve(customFieldCreate.execute(INPUT, ctx)),
    Error,
  );
  assertEquals(err.message.includes("The thing could not be found."), true, err.message);
});

Deno.test("custom-field-create: a 200 carrying success:false is still a failure", async () => {
  const { ctx } = mockCtx([{ body: { success: false, message: "refused" } }]);
  await assertRejects(
    () => Promise.resolve(customFieldCreate.execute(INPUT, ctx)),
    Error,
    "refused",
  );
});
