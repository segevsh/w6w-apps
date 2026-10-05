import { assertEquals, assertRejects } from "@std/assert";
import customFieldDelete from "../../actions/custom-field-delete.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "productId": "productId-1==", "name": "name-1" };

Deno.test("custom-field-delete: sends DELETE /v2/products/productId-1%3D%3D/custom_fields/name-1 with the mapped parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: { "success": true, "message": "deleted" } }]);
  await customFieldDelete.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v2/products/productId-1%3D%3D/custom_fields/name-1");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
});

Deno.test("custom-field-delete: returns the documented result shape", async () => {
  const { ctx } = mockCtx([{ body: { "success": true, "message": "deleted" } }]);
  assertEquals(await customFieldDelete.execute(INPUT, ctx), { "message": "deleted" });
});

Deno.test("custom-field-delete: a 404 surfaces Gumroad's own message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { success: false, message: "The thing could not be found." },
  }]);
  const err = await assertRejects(
    () => Promise.resolve(customFieldDelete.execute(INPUT, ctx)),
    Error,
  );
  assertEquals(err.message.includes("The thing could not be found."), true, err.message);
});

Deno.test("custom-field-delete: a 200 carrying success:false is still a failure", async () => {
  const { ctx } = mockCtx([{ body: { success: false, message: "refused" } }]);
  await assertRejects(
    () => Promise.resolve(customFieldDelete.execute(INPUT, ctx)),
    Error,
    "refused",
  );
});
