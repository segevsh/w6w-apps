import { assertEquals } from "@std/assert";
import backlinksAnchorsGet from "../../actions/backlinks-anchors-get.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("backlinks-anchors-get: GETs the anchor rows and unwraps data", async () => {
  const { ctx, calls } = mockCtx([
    { body: envelope([{ anchor: "example", backlinks_count: 5, domains_count: 3 }]) },
  ]);

  const out = await backlinksAnchorsGet.execute(
    { url: "example.com", scope: "ROOT_DOMAIN" },
    ctx,
  ) as { data: Array<Record<string, unknown>> };

  assertEquals(pathOf(calls[0].url), "/apis/v4/backlinks/v1/anchors");
  assertEquals(queryOf(calls[0].url), { url: "example.com", scope: "ROOT_DOMAIN" });
  assertEquals(out.data[0].anchor, "example");
});

Deno.test("backlinks-anchors-get: sorts by domains_count DESC by default", () => {
  const orderBy = backlinksAnchorsGet.params?.find((p) => p.key === "order_by");
  const direction = backlinksAnchorsGet.params?.find((p) => p.key === "direction");
  assertEquals(orderBy?.default, "domains_count");
  assertEquals(direction?.default, "DESC");
});

Deno.test("backlinks-anchors-get: forwards direction and paging", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([]) }]);

  await backlinksAnchorsGet.execute(
    { url: "example.com", scope: "SUBDOMAIN", direction: "ASC", limit: 30, offset: 30 },
    ctx,
  );

  assertEquals(queryOf(calls[0].url), {
    url: "example.com",
    scope: "SUBDOMAIN",
    direction: "ASC",
    limit: "30",
    offset: "30",
  });
});
