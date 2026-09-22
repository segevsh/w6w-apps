import { assertEquals } from "@std/assert";
import backlinksMatrixGet from "../../actions/backlinks-matrix-get.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("backlinks-matrix-get: joins `urls` and unwraps the per-target counts", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: envelope([
        {
          domain: "blog.example",
          backlinks_counts: [4, 0],
          matches_count: 1,
          domain_score: 30,
          ip_address: "203.0.113.1",
          country: "US",
        },
      ]),
    },
  ]);

  const out = await backlinksMatrixGet.execute(
    { urls: ["a.example", "b.example"], scope: "ROOT_DOMAIN" },
    ctx,
  ) as { data: Array<Record<string, unknown>> };

  assertEquals(pathOf(calls[0].url), "/apis/v4/backlinks/v1/matrix");
  assertEquals(queryOf(calls[0].url), { urls: "a.example,b.example", scope: "ROOT_DOMAIN" });
  assertEquals(out.data[0].backlinks_counts, [4, 0]);
});

/**
 * The v4 reference documents no `format` parameter for this endpoint — it is
 * JSON only — so the app must not invent one.
 */
Deno.test("backlinks-matrix-get: exposes no `format` param and no `fields` param", () => {
  const keys = backlinksMatrixGet.params?.map((p) => p.key) ?? [];
  assertEquals(keys.includes("format"), false);
  assertEquals(keys.includes("fields"), false);
});

Deno.test("backlinks-matrix-get: forwards sort, filter and paging", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([]) }]);

  await backlinksMatrixGet.execute(
    {
      urls: ["a.example"],
      scope: "PAGE",
      order_by: "matches_count",
      direction: "ASC",
      limit: 10,
      offset: 10,
      filter: "matches_count>0",
    },
    ctx,
  );

  assertEquals(queryOf(calls[0].url), {
    urls: "a.example",
    scope: "PAGE",
    order_by: "matches_count",
    direction: "ASC",
    limit: "10",
    offset: "10",
    filter: "matches_count>0",
  });
});
