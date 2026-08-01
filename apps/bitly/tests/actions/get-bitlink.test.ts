import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-bitlink.ts";

Deno.test("get-bitlink: GETs /bitlinks/{bitlink}", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: { id: "bit.ly/abc123", link: "https://bit.ly/abc123", long_url: "https://example.com" },
    },
  ]);
  const out = await action.execute({ bitlink: "bit.ly/abc123" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v4/bitlinks/bit.ly/abc123");
  assertEquals(calls[0].method, "GET");
  assertEquals(out.long_url, "https://example.com");
});
