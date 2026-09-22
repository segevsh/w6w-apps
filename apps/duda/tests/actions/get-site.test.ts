import { assertEquals } from "@std/assert";
import { EU, mockConnectedCtx, pathOf } from "../_helpers.ts";
import action from "../../actions/get-site.ts";

Deno.test("get-site: GETs the site on the EU host when the connection says EU", async () => {
  const { ctx, calls } = mockConnectedCtx(
    [{ body: { site_name: "abc1234d", publish_status: "PUBLISHED" } }],
    "EU",
  );
  const result = await action.execute!({ siteName: "abc1234d" }, ctx) as {
    publish_status: string;
  };
  assertEquals(calls[0].url, `${EU}/api/sites/multiscreen/abc1234d`);
  assertEquals(result.publish_status, "PUBLISHED");
});

Deno.test("get-site: an ambiguous region on the connection falls back to US", async () => {
  const { ctx, calls } = mockConnectedCtx([{ body: {} }]);
  (ctx.connection as { display: Record<string, unknown> }).display = { region: "apac" };
  await action.execute!({ siteName: "abc" }, ctx);
  assertEquals(new URL(calls[0].url).hostname, "api.duda.co");
});

Deno.test("get-site: encodes the alias as one path segment", async () => {
  const { ctx, calls } = mockConnectedCtx([{ body: {} }]);
  await action.execute!({ siteName: "a b/c" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/sites/multiscreen/a%20b%2Fc");
});
