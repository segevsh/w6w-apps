import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-bitlink.ts";

Deno.test("update-bitlink: PATCHes /bitlinks/{bitlink} with the supplied fields", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        id: "bit.ly/abc123",
        link: "https://bit.ly/abc123",
        long_url: "https://new.example.com",
        archived: false,
      },
    },
  ]);
  const out = await action.execute({
    bitlink: "bit.ly/abc123",
    longUrl: "https://new.example.com",
    title: "New title",
    archived: false,
  }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(new URL(calls[0].url).pathname, "/v4/bitlinks/bit.ly/abc123");
  const sent = JSON.parse(calls[0].body ?? "{}");
  assertEquals(sent.long_url, "https://new.example.com");
  assertEquals(sent.title, "New title");
  assertEquals(sent.archived, false);
  assertEquals(out.long_url, "https://new.example.com");
});
