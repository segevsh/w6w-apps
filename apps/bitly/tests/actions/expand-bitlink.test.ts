import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/expand-bitlink.ts";

Deno.test("expand-bitlink: POSTs /expand with bitlink_id", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: { id: "bit.ly/abc123", link: "https://bit.ly/abc123", long_url: "https://example.com" },
    },
  ]);
  const out = await action.execute({ bitlinkId: "bit.ly/abc123" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v4/expand");
  const sent = JSON.parse(calls[0].body ?? "{}");
  assertEquals(sent.bitlink_id, "bit.ly/abc123");
  assertEquals(out.long_url, "https://example.com");
});
