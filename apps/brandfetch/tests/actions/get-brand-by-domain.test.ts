import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/get-brand-by-domain.ts";
import { mockCtx, run } from "../_helpers.ts";
import { BRAND } from "../_fixtures.ts";

Deno.test("get-brand-by-domain: calls /v2/brands/domain/nike.com and maps the brand", async () => {
  const { ctx, calls } = mockCtx([{ body: BRAND }]);
  const out = await run(action, { domain: "nike.com" }, ctx);
  assertEquals(calls[0].url, "https://api.brandfetch.io/v2/brands/domain/nike.com");
  assertEquals(calls[0].method, "GET");
  assertEquals(out.found, true);
  assertEquals(out.name, "Nike");
});

Deno.test("get-brand-by-domain: cachedOnly 204 is notIndexed; a plain 404 throws", async () => {
  const none = mockCtx([{ status: 204 }]);
  assertEquals(await run(action, { domain: "nike.com", cachedOnly: true }, none.ctx), {
    found: false,
    notIndexed: true,
  });
  assertEquals(new URL(none.calls[0].url).searchParams.get("cachedOnly"), "true");
  const nf = mockCtx([{ status: 404, body: { message: "Not Found" } }]);
  await assertRejects(() => run(action, { domain: "nike.com" }, nf.ctx), Error, "404");
});
