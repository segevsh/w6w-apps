import { assertEquals } from "@std/assert";
import subdomainsList from "../../actions/subdomains-list.ts";
import { mockCtx, pathOf, queryOf, withCredits } from "../_helpers.ts";

Deno.test("subdomains-list: builds the request against /v2/subdomains/", async () => {
  const results = [
    {
      domain: "example.com",
      subdomains: {
        "status.example.com": { createdAt: 1670285563, updatedAt: 1675604779 },
        "shop.example.com": { createdAt: 1670285563, updatedAt: 1675604779 },
      },
      moreAfter: "shop.example.com",
    },
  ];
  const { ctx, calls } = mockCtx([withCredits(results, 1, 999)]);
  const out = await subdomainsList.execute(
    { domains: "example.com, example.org", limit: 100, after: "shop.example.com" },
    ctx,
  ) as { results: unknown[]; creditsSpent: number; creditsRemaining: number };

  assertEquals(pathOf(calls[0].url), "/v2/subdomains/");
  assertEquals(queryOf(calls[0].url), {
    domains: "example.com,example.org",
    limit: "100",
    after: "shop.example.com",
  });
  assertEquals(out.results, results);
  assertEquals(out.creditsSpent, 1);
  assertEquals(out.creditsRemaining, 999);
});

Deno.test("subdomains-list: domains is required, limit must be a multiple of 10", () => {
  const domainsParam = subdomainsList.params?.find((p) => p.key === "domains");
  const limitParam = subdomainsList.params?.find((p) => p.key === "limit");
  assertEquals(domainsParam?.required, true);
  assertEquals(limitParam?.validation?.min, 10);
});
