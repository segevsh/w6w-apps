import { assertEquals, assertRejects } from "@std/assert";
import backlinksOverviewGet from "../../actions/backlinks-overview-get.ts";
import { envelope, errorEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("backlinks-overview-get: GETs the overview and unwraps data", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: envelope({
        backlinks_count: 1200,
        domains_count: 340,
        follows_count: 900,
        score: 42,
      }),
    },
  ]);

  const out = await backlinksOverviewGet.execute(
    { url: "example.com", scope: "ROOT_DOMAIN" },
    ctx,
  ) as { data: Record<string, number> };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/apis/v4/backlinks/v1/overview");
  assertEquals(queryOf(calls[0].url), { url: "example.com", scope: "ROOT_DOMAIN" });
  assertEquals(out.data.backlinks_count, 1200);
  assertEquals(out.data.score, 42);
});

Deno.test("backlinks-overview-get: joins `fields` into one comma-separated value", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ backlinks_count: 1 }) }]);

  await backlinksOverviewGet.execute(
    { url: "example.com", scope: "PAGE", fields: ["backlinks_count", "score"] },
    ctx,
  );

  assertEquals(queryOf(calls[0].url).fields, "backlinks_count,score");
});

Deno.test("backlinks-overview-get: a documented error envelope becomes one readable line", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorEnvelope(401, "Unauthorized") }]);

  const err = await assertRejects(async () => {
    await backlinksOverviewGet.execute({ url: "example.com", scope: "ROOT_DOMAIN" }, ctx);
  }, Error);
  assertEquals(
    err.message,
    "SEMrush 401 401 for GET /apis/v4/backlinks/v1/overview: Unauthorized",
  );
});

Deno.test("backlinks-overview-get: `scope` is required and offers four choices", () => {
  const scope = backlinksOverviewGet.params?.find((p) => p.key === "scope");
  assertEquals(scope?.required, true);
  const values = Array.isArray(scope?.options) ? scope.options.map((o) => o.value) : [];
  assertEquals(values, ["ROOT_DOMAIN", "SUBDOMAIN", "SUBFOLDER", "PAGE"]);
});
