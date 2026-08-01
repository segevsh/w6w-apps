import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/expand-url.ts";

Deno.test("expand-url: GETs /unshorten with the url query param", async () => {
  const body = { url: "https://twitter.com/full/path", hops: 2, trace: ["a", "b"] };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ url: "https://t.co/abc123" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/unshorten");
  assertEquals(url.searchParams.get("url"), "https://t.co/abc123");
  assertEquals(result, body);
});
