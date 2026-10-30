import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/sitemap-get.ts";

test("sitemap-get: builds the nested sites/{siteUrl}/sitemaps/{feedpath} path", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { path: "https://www.example.com/sitemap.xml" },
  }], {
    display: { siteUrl: "https://www.example.com/" },
  });
  await action.execute!({ feedpath: "https://www.example.com/sitemap.xml" }, ctx);
  assertEquals(
    decodeURIComponent(new URL(calls[0].url).pathname),
    "/webmasters/v3/sites/https://www.example.com//sitemaps/https://www.example.com/sitemap.xml",
  );
});

test("sitemap-get: feedpath is required", async () => {
  const { ctx, calls } = mockCtx([], { display: { siteUrl: "https://www.example.com/" } });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`feedpath`");
  assertEquals(calls.length, 0);
});
