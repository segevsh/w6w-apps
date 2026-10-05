import { assertEquals, assertRejects } from "@std/assert";
import offerCodeDelete from "../../actions/offer-code-delete.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "productId": "productId-1==", "offerCodeId": "offerCodeId-1==" };

Deno.test("offer-code-delete: sends DELETE /v2/products/productId-1%3D%3D/offer_codes/offerCodeId-1%3D%3D with the mapped parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: { "success": true, "message": "deleted" } }]);
  await offerCodeDelete.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(
    pathOf(calls[0].url),
    "/v2/products/productId-1%3D%3D/offer_codes/offerCodeId-1%3D%3D",
  );
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
});

Deno.test("offer-code-delete: returns the documented result shape", async () => {
  const { ctx } = mockCtx([{ body: { "success": true, "message": "deleted" } }]);
  assertEquals(await offerCodeDelete.execute(INPUT, ctx), { "message": "deleted" });
});

Deno.test("offer-code-delete: a 404 surfaces Gumroad's own message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { success: false, message: "The thing could not be found." },
  }]);
  const err = await assertRejects(
    () => Promise.resolve(offerCodeDelete.execute(INPUT, ctx)),
    Error,
  );
  assertEquals(err.message.includes("The thing could not be found."), true, err.message);
});

Deno.test("offer-code-delete: a 200 carrying success:false is still a failure", async () => {
  const { ctx } = mockCtx([{ body: { success: false, message: "refused" } }]);
  await assertRejects(() => Promise.resolve(offerCodeDelete.execute(INPUT, ctx)), Error, "refused");
});
