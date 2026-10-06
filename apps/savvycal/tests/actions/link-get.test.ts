import { assertEquals } from "@std/assert";
import linkGet from "../../actions/link-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("link-get: GET /v1/links/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "link_1", slug: "30min" } }]);
  const out = await linkGet.execute({ linkId: "link_1" }, ctx) as { slug: string };
  assertEquals(pathOf(calls[0].url), "/v1/links/link_1");
  assertEquals(out.slug, "30min");
});

Deno.test("link-get: the id is path-escaped", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await linkGet.execute({ linkId: "a/b?c" }, ctx);
  assertEquals(calls[0].url, "https://api.savvycal.com/v1/links/a%2Fb%3Fc");
});
