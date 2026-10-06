import { assertEquals, assertRejects } from "@std/assert";
import map from "../../actions/map.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("map: mirrors the proxy choice into the body and wraps the result", async () => {
  const { ctx, calls } = mockCtx([{ body: ["https://a.com/x"] }]);
  const out = await map.execute(
    { url: "https://a.com", search: " pricing ", limit: 10, sitemap: "only", proxy: "datacenter" },
    ctx,
  );
  assertEquals(out, { data: ["https://a.com/x"] });
  assertEquals(calls[0].url, "https://production-sfo.browserless.io/map?proxy=datacenter");
  assertEquals(JSON.parse(calls[0].body!), {
    url: "https://a.com",
    search: "pricing",
    limit: 10,
    sitemap: "only",
    proxy: "datacenter",
  });
});

Deno.test("map: boolean false is sent, not dropped", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await map.execute({
    url: "https://a.com",
    includeSubdomains: false,
    ignoreQueryParameters: false,
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    url: "https://a.com",
    includeSubdomains: false,
    ignoreQueryParameters: false,
  });
});

Deno.test("map: needs a URL; a 429 is thrown with the retry hint", async () => {
  const { ctx } = mockCtx([{ status: 429, body: "Too many requests" }]);
  await assertRejects(async () => await map.execute({ url: "" }, ctx), Error, "URL is required");
  await assertRejects(
    async () => await map.execute({ url: "https://a.com" }, ctx),
    Error,
    "retry with backoff",
  );
});
