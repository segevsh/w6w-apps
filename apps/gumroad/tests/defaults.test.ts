import { assertEquals } from "@std/assert";
import licenseVerify from "../actions/license-verify.ts";
import subscriberList from "../actions/subscriber-list.ts";
import productCreate from "../actions/product-create.ts";
import productUpdate from "../actions/product-update.ts";
import { mockCtx, queryOf } from "./_helpers.ts";

/** Gumroad's own default is to COUNT a use on every verify; ours must not. */
Deno.test("license-verify: increment_uses_count is sent as false unless asked for", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, uses: 1, purchase: {} } }]);
  await licenseVerify.execute({ productId: "p", licenseKey: "k" }, ctx);
  assertEquals(new URLSearchParams(calls[0].body!).get("increment_uses_count"), "false");
});

Deno.test("license-verify: Increment uses count true is sent as the string true", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, uses: 1, purchase: {} } }]);
  await licenseVerify.execute({ productId: "p", licenseKey: "k", incrementUsesCount: true }, ctx);
  assertEquals(new URLSearchParams(calls[0].body!).get("increment_uses_count"), "true");
});

Deno.test("subscriber-list: paginated defaults to true so the list is bounded", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, subscribers: [] } }]);
  const out = await subscriberList.execute({ productId: "p" }, ctx);
  assertEquals(queryOf(calls[0].url), { paginated: "true" });
  assertEquals(out, { subscribers: [], nextPageKey: null });
});

Deno.test("subscriber-list: paginated=false is expressible", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, subscribers: [] } }]);
  await subscriberList.execute({ productId: "p", paginated: false }, ctx);
  assertEquals(queryOf(calls[0].url), { paginated: "false" });
});

Deno.test("product-create: unset optionals are absent, false and 0 are kept", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, product: {} } }]);
  await productCreate.execute(
    { name: "N", price: 0, published: false, tags: "x, y" },
    ctx,
  );
  assertEquals([...new URLSearchParams(calls[0].body!)], [
    ["name", "N"],
    ["price", "0"],
    ["tags[]", "x"],
    ["tags[]", "y"],
    ["published", "false"],
  ]);
});

Deno.test("product-update: an empty update sends an empty body", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, product: {} } }]);
  await productUpdate.execute({ productId: "p" }, ctx);
  assertEquals(calls[0].body, "");
});
