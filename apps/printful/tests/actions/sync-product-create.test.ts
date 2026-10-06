import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/sync-product-create.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("sync-product-create: POST /store/products and unwraps the envelope", async () => {
  const { ctx, calls } = mockCtx([{ body: { "code": 200, "result": { "id": 9, "name": "Tee" } } }]);
  const out = await action.execute!({
    "name": "Tee",
    "externalId": "e1",
    "syncVariants": '[{"variant_id":4011,"files":[{"url":"https://x/y.png"}]}]',
  }, ctx);
  assertEquals(out, { "id": 9, "name": "Tee" });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.printful.com/store/products");
  assertEquals(JSON.parse(calls[0].body!), {
    "sync_product": { "name": "Tee", "external_id": "e1" },
    "sync_variants": [{ "variant_id": 4011, "files": [{ "url": "https://x/y.png" }] }],
  });
});

Deno.test("sync-product-create: a Printful error is surfaced with its reason and message", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    headers: { "content-type": "application/json", "x-ratelimit-reset": "30" },
    body: {
      code: 429,
      result: "Too many requests",
      error: { reason: "Too Many Requests", message: "slow down" },
    },
  }]);
  await assertRejects(
    async () =>
      await action.execute!({
        "name": "Tee",
        "externalId": "e1",
        "syncVariants": '[{"variant_id":4011,"files":[{"url":"https://x/y.png"}]}]',
      }, ctx),
    Error,
    "HTTP 429 — Too Many Requests: slow down (rate limit resets in 30s)",
  );
});
