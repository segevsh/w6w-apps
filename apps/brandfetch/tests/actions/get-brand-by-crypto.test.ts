import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/get-brand-by-crypto.ts";
import { mockCtx, run } from "../_helpers.ts";
import { BRAND } from "../_fixtures.ts";

Deno.test("get-brand-by-crypto: calls /v2/brands/crypto/BTC and maps the brand", async () => {
  const { ctx, calls } = mockCtx([{ body: BRAND }]);
  const out = await run(action, { symbol: "BTC" }, ctx);
  assertEquals(calls[0].url, "https://api.brandfetch.io/v2/brands/crypto/BTC");
  assertEquals(calls[0].method, "GET");
  assertEquals(out.found, true);
  assertEquals(out.name, "Nike");
});

Deno.test("get-brand-by-crypto: cachedOnly 204 is notIndexed; a plain 404 throws", async () => {
  const none = mockCtx([{ status: 204 }]);
  assertEquals(await run(action, { symbol: "BTC", cachedOnly: true }, none.ctx), {
    found: false,
    notIndexed: true,
  });
  assertEquals(new URL(none.calls[0].url).searchParams.get("cachedOnly"), "true");
  const nf = mockCtx([{ status: 404, body: { message: "Not Found" } }]);
  await assertRejects(() => run(action, { symbol: "BTC" }, nf.ctx), Error, "404");
});
