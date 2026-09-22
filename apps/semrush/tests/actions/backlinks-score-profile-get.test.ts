import { assertEquals } from "@std/assert";
import backlinksScoreProfileGet from "../../actions/backlinks-score-profile-get.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("backlinks-score-profile-get: GETs the score distribution and unwraps data", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: envelope([{ domain_score: 0, domains_count: 12 }, {
        domain_score: 1,
        domains_count: 4,
      }]),
    },
  ]);

  const out = await backlinksScoreProfileGet.execute(
    { url: "example.com", scope: "ROOT_DOMAIN" },
    ctx,
  ) as { data: Array<Record<string, number>> };

  assertEquals(pathOf(calls[0].url), "/apis/v4/backlinks/v1/score-profile");
  assertEquals(queryOf(calls[0].url), { url: "example.com", scope: "ROOT_DOMAIN" });
  assertEquals(out.data.length, 2);
  assertEquals(out.data[0].domain_score, 0);
});

/**
 * The v4 reference documents no `fields`, `order_by`, `limit`, `offset` or
 * `filter` for this endpoint — its row set is fixed by the 0-100 score range.
 * Exposing one anyway would be inventing a parameter.
 */
Deno.test("backlinks-score-profile-get: exposes only url and scope", () => {
  assertEquals(
    backlinksScoreProfileGet.params?.map((p) => p.key),
    ["url", "scope"],
  );
});
