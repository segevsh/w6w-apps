import { assertEquals } from "@std/assert";
import backlinksCompetitorsGet from "../../actions/backlinks-competitors-get.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("backlinks-competitors-get: GETs competitors keyed by `domain`, not `url`", async () => {
  const { ctx, calls } = mockCtx([
    { body: envelope([{ domain: "rival.example", common_refdomains: 88, similarity: 0.71 }]) },
  ]);

  const out = await backlinksCompetitorsGet.execute({ domain: "example.com" }, ctx) as {
    data: Array<Record<string, unknown>>;
  };

  assertEquals(pathOf(calls[0].url), "/apis/v4/backlinks/v1/competitors");
  // No `scope` on this endpoint at all.
  assertEquals(queryOf(calls[0].url), { domain: "example.com" });
  assertEquals(out.data[0].similarity, 0.71);
});

Deno.test("backlinks-competitors-get: sorts by similarity DESC by default", () => {
  const orderBy = backlinksCompetitorsGet.params?.find((p) => p.key === "order_by");
  const direction = backlinksCompetitorsGet.params?.find((p) => p.key === "direction");
  assertEquals(orderBy?.default, "similarity");
  assertEquals(direction?.default, "DESC");
});

Deno.test("backlinks-competitors-get: has no scope param, and domain is required", () => {
  assertEquals(backlinksCompetitorsGet.params?.some((p) => p.key === "scope"), false);
  assertEquals(backlinksCompetitorsGet.params?.find((p) => p.key === "domain")?.required, true);
});

Deno.test("backlinks-competitors-get: forwards fields and paging", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([]) }]);

  await backlinksCompetitorsGet.execute(
    { domain: "example.com", fields: ["domain", "similarity"], limit: 10, offset: 20 },
    ctx,
  );

  assertEquals(queryOf(calls[0].url), {
    domain: "example.com",
    fields: "domain,similarity",
    limit: "10",
    offset: "20",
  });
});
