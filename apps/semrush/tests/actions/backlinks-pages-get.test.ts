import { assertEquals } from "@std/assert";
import backlinksPagesGet from "../../actions/backlinks-pages-get.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("backlinks-pages-get: GETs the linked pages and unwraps data", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: envelope([
        {
          source_url: "https://example.com/blog/post",
          source_title: "A post",
          domains_count: 9,
          response_code: 200,
        },
      ]),
    },
  ]);

  const out = await backlinksPagesGet.execute(
    { url: "example.com", scope: "ROOT_DOMAIN" },
    ctx,
  ) as { data: Array<Record<string, unknown>> };

  assertEquals(pathOf(calls[0].url), "/apis/v4/backlinks/v1/pages");
  assertEquals(queryOf(calls[0].url), { url: "example.com", scope: "ROOT_DOMAIN" });
  assertEquals(out.data[0].source_title, "A post");
});

Deno.test("backlinks-pages-get: sorts by domains_count DESC by default", () => {
  const orderBy = backlinksPagesGet.params?.find((p) => p.key === "order_by");
  const direction = backlinksPagesGet.params?.find((p) => p.key === "direction");
  assertEquals(orderBy?.default, "domains_count");
  assertEquals(direction?.default, "DESC");
});

Deno.test("backlinks-pages-get: forwards fields, filter and paging", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([]) }]);

  await backlinksPagesGet.execute(
    {
      url: "example.com",
      scope: "PAGE",
      fields: ["source_url", "domains_count"],
      limit: 25,
      offset: 50,
      filter: "response_code=200",
    },
    ctx,
  );

  assertEquals(queryOf(calls[0].url), {
    url: "example.com",
    scope: "PAGE",
    fields: "source_url,domains_count",
    limit: "25",
    offset: "50",
    filter: "response_code=200",
  });
});
