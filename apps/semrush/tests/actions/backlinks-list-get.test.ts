import { assertEquals } from "@std/assert";
import backlinksListGet from "../../actions/backlinks-list-get.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("backlinks-list-get: GETs the link rows and unwraps data", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: envelope([
        { anchor: "click here", domain_score: 12, is_nofollow: false, response_code: 200 },
      ]),
    },
  ]);

  const out = await backlinksListGet.execute(
    { url: "example.com", scope: "ROOT_DOMAIN", limit: 100 },
    ctx,
  ) as { data: Array<Record<string, unknown>> };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/apis/v4/backlinks/v1/links");
  assertEquals(queryOf(calls[0].url), { url: "example.com", scope: "ROOT_DOMAIN", limit: "100" });
  assertEquals(out.data[0].anchor, "click here");
});

Deno.test("backlinks-list-get: forwards the full sort/page/filter set", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([]) }]);

  await backlinksListGet.execute(
    {
      url: "example.com",
      scope: "PAGE",
      fields: ["anchor", "domain_score"],
      order_by: "domain_score",
      direction: "ASC",
      limit: 50,
      offset: 100,
      filter: "domain_score>10",
    },
    ctx,
  );

  assertEquals(queryOf(calls[0].url), {
    url: "example.com",
    scope: "PAGE",
    fields: "anchor,domain_score",
    order_by: "domain_score",
    direction: "ASC",
    limit: "50",
    offset: "100",
    filter: "domain_score>10",
  });
});

Deno.test("backlinks-list-get: an empty page is an empty array, never undefined", async () => {
  const { ctx } = mockCtx([{ body: envelope([]) }]);

  const out = await backlinksListGet.execute(
    { url: "example.com", scope: "ROOT_DOMAIN" },
    ctx,
  ) as { data: unknown[] };

  assertEquals(out.data, []);
});

Deno.test("backlinks-list-get: order_by has no prefilled default and direction defaults to DESC", () => {
  const orderBy = backlinksListGet.params?.find((p) => p.key === "order_by");
  const direction = backlinksListGet.params?.find((p) => p.key === "direction");
  assertEquals(orderBy?.default, undefined);
  assertEquals(direction?.default, "DESC");
});
