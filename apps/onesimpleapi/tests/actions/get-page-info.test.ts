import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-page-info.ts";

Deno.test("get-page-info: GETs /page_info with the url query param", async () => {
  const body = { general: { title: "Example" }, twitter: {}, og: {}, elapsed: 0.1 };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ url: "https://example.com" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/page_info");
  assertEquals(url.searchParams.get("url"), "https://example.com");
  assertEquals(url.searchParams.has("headers"), false);
  assertEquals(result, body);
});

Deno.test("get-page-info: sets headers=yes only when requested", async () => {
  const { ctx, calls } = mockCtx([{ body: { general: {} } }]);
  await action.execute!({ url: "https://example.com", headers: true }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("headers"), "yes");
});
