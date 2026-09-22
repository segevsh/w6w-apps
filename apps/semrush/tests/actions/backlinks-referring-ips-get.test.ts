import { assertEquals } from "@std/assert";
import backlinksReferringIpsGet from "../../actions/backlinks-referring-ips-get.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("backlinks-referring-ips-get: GETs ref-ips and unwraps data", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: envelope([
        { ip_address: "203.0.113.10", domains_count: 7, backlinks_count: 22, country: "US" },
      ]),
    },
  ]);

  const out = await backlinksReferringIpsGet.execute(
    { url: "example.com", scope: "ROOT_DOMAIN" },
    ctx,
  ) as { data: Array<Record<string, unknown>> };

  assertEquals(pathOf(calls[0].url), "/apis/v4/backlinks/v1/ref-ips");
  assertEquals(queryOf(calls[0].url), { url: "example.com", scope: "ROOT_DOMAIN" });
  assertEquals(out.data[0].ip_address, "203.0.113.10");
});

Deno.test("backlinks-referring-ips-get: sorts by domains_count DESC by default", () => {
  const orderBy = backlinksReferringIpsGet.params?.find((p) => p.key === "order_by");
  const direction = backlinksReferringIpsGet.params?.find((p) => p.key === "direction");
  assertEquals(orderBy?.default, "domains_count");
  assertEquals(direction?.default, "DESC");
});

Deno.test("backlinks-referring-ips-get: forwards the four-target scope and paging", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([]) }]);

  await backlinksReferringIpsGet.execute(
    { url: "example.com", scope: "SUBFOLDER", limit: 10, offset: 5 },
    ctx,
  );

  assertEquals(queryOf(calls[0].url), {
    url: "example.com",
    scope: "SUBFOLDER",
    limit: "10",
    offset: "5",
  });
});
