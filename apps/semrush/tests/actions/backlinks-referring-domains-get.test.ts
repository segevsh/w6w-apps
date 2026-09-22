import { assertEquals } from "@std/assert";
import backlinksReferringDomainsGet from "../../actions/backlinks-referring-domains-get.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("backlinks-referring-domains-get: GETs ref-domains and unwraps data", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: envelope([
        { domain: "blog.example", backlinks_count: 4, domain_score: 30, is_follow: true },
      ]),
    },
  ]);

  const out = await backlinksReferringDomainsGet.execute(
    { url: "example.com", scope: "ROOT_DOMAIN" },
    ctx,
  ) as { data: Array<Record<string, unknown>> };

  assertEquals(pathOf(calls[0].url), "/apis/v4/backlinks/v1/ref-domains");
  assertEquals(queryOf(calls[0].url), { url: "example.com", scope: "ROOT_DOMAIN" });
  assertEquals(out.data[0].domain, "blog.example");
});

Deno.test("backlinks-referring-domains-get: sorts by backlinks_count DESC by default", () => {
  const orderBy = backlinksReferringDomainsGet.params?.find((p) => p.key === "order_by");
  const direction = backlinksReferringDomainsGet.params?.find((p) => p.key === "direction");
  assertEquals(orderBy?.default, "backlinks_count");
  assertEquals(direction?.default, "DESC");
});

Deno.test("backlinks-referring-domains-get: forwards filter and paging", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([]) }]);

  await backlinksReferringDomainsGet.execute(
    {
      url: "example.com",
      scope: "SUBFOLDER",
      order_by: "domain_score",
      direction: "ASC",
      limit: 20,
      offset: 40,
      filter: "is_follow=true",
    },
    ctx,
  );

  assertEquals(queryOf(calls[0].url), {
    url: "example.com",
    scope: "SUBFOLDER",
    order_by: "domain_score",
    direction: "ASC",
    limit: "20",
    offset: "40",
    filter: "is_follow=true",
  });
});
