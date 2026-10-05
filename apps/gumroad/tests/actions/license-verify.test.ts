import { assertEquals, assertRejects } from "@std/assert";
import licenseVerify from "../../actions/license-verify.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = {
  "productId": "productId-1==",
  "licenseKey": "licenseKey-1",
  "incrementUsesCount": true,
};

Deno.test("license-verify: sends POST /v2/licenses/verify with the mapped parameters", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "uses": 3, "purchase": { "id": "p1" } },
  }]);
  await licenseVerify.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/licenses/verify");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals([...new URLSearchParams(calls[0].body ?? "")], [["product_id", "productId-1=="], [
    "license_key",
    "licenseKey-1",
  ], ["increment_uses_count", "true"]]);
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
});

Deno.test("license-verify: returns the documented result shape", async () => {
  const { ctx } = mockCtx([{ body: { "success": true, "uses": 3, "purchase": { "id": "p1" } } }]);
  assertEquals(await licenseVerify.execute(INPUT, ctx), { "uses": 3, "purchase": { "id": "p1" } });
});

Deno.test("license-verify: a 404 surfaces Gumroad's own message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { success: false, message: "The thing could not be found." },
  }]);
  const err = await assertRejects(() => Promise.resolve(licenseVerify.execute(INPUT, ctx)), Error);
  assertEquals(err.message.includes("The thing could not be found."), true, err.message);
});

Deno.test("license-verify: a 200 carrying success:false is still a failure", async () => {
  const { ctx } = mockCtx([{ body: { success: false, message: "refused" } }]);
  await assertRejects(() => Promise.resolve(licenseVerify.execute(INPUT, ctx)), Error, "refused");
});
