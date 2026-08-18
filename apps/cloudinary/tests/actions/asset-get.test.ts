import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action, { encodePublicId } from "../../actions/asset-get.ts";

const conn = { display: { cloudName: "acme", region: "us" } };

Deno.test("asset-get: reads one asset by public id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { public_id: "products/hero" } }], conn);
  await action.execute!({ publicId: "products/hero" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1_1/acme/resources/image/upload/products/hero");
});

/** Folder slashes are path structure; anything else in the id must be escaped. */
Deno.test("encodePublicId: escapes each segment but keeps the slashes", () => {
  assertEquals(encodePublicId("products/hero shot"), "products/hero%20shot");
  assertEquals(encodePublicId("a/b?c"), "a/b%3Fc");
});

Deno.test("asset-get: a missing public id is refused", async () => {
  const { ctx } = mockCtx([], conn);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "publicId");
});
