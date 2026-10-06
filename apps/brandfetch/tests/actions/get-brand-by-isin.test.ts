import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/get-brand-by-isin.ts";
import { mockCtx, run } from "../_helpers.ts";
import { BRAND } from "../_fixtures.ts";

Deno.test("get-brand-by-isin: calls /v2/brands/isin/US6541061031 and maps the brand", async () => {
  const { ctx, calls } = mockCtx([{ body: BRAND }]);
  const out = await run(action, { isin: "US6541061031" }, ctx);
  assertEquals(calls[0].url, "https://api.brandfetch.io/v2/brands/isin/US6541061031");
  assertEquals(calls[0].method, "GET");
  assertEquals(out.found, true);
  assertEquals(out.name, "Nike");
});

Deno.test("get-brand-by-isin: cachedOnly 204 is notIndexed; a plain 404 throws", async () => {
  const none = mockCtx([{ status: 204 }]);
  assertEquals(await run(action, { isin: "US6541061031", cachedOnly: true }, none.ctx), {
    found: false,
    notIndexed: true,
  });
  assertEquals(new URL(none.calls[0].url).searchParams.get("cachedOnly"), "true");
  const nf = mockCtx([{ status: 404, body: { message: "Not Found" } }]);
  await assertRejects(() => run(action, { isin: "US6541061031" }, nf.ctx), Error, "404");
});
