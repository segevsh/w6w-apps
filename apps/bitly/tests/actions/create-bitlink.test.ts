import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-bitlink.ts";

Deno.test("create-bitlink: POSTs /bitlinks with long_url and optional fields", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: { id: "bit.ly/abc123", link: "https://bit.ly/abc123", long_url: "https://example.com" },
    },
  ]);
  const out = await action.execute({
    longUrl: "https://example.com",
    domain: "bit.ly",
    groupGuid: "Ba1bc23dE4F",
    title: "Example",
    tags: ["demo"],
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v4/bitlinks");
  const sent = JSON.parse(calls[0].body ?? "{}");
  assertEquals(sent.long_url, "https://example.com");
  assertEquals(sent.domain, "bit.ly");
  assertEquals(sent.group_guid, "Ba1bc23dE4F");
  assertEquals(sent.title, "Example");
  assertEquals(sent.tags, ["demo"]);
  assertEquals(out.link, "https://bit.ly/abc123");
});

Deno.test("create-bitlink: omits optional fields when not supplied", async () => {
  const { ctx, calls } = mockCtx([{
    body: { id: "x", link: "https://bit.ly/x", long_url: "https://a.com" },
  }]);
  await action.execute({ longUrl: "https://a.com" }, ctx);
  const sent = JSON.parse(calls[0].body ?? "{}");
  assertEquals(sent.long_url, "https://a.com");
  assertEquals(sent.domain, undefined);
  assertEquals(sent.group_guid, undefined);
});
