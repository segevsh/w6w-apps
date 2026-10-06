import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/enrich-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("enrich-get: GETs the enrichment by id and shapes the result", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      id: "e/1",
      name: "N",
      status: "FINISHED",
      cost: { credits: 14 },
      data: [{ custom: {} }],
    },
  }]);
  const out = await action.execute!({ enrichmentId: "e/1", forceResults: true }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v2/contact/enrich/bulk/e%2F1");
  assertEquals(url.searchParams.get("forceResults"), "true");
  assertEquals(calls[0].method, "GET");
  assertEquals(out, {
    id: "e/1",
    name: "N",
    status: "FINISHED",
    credits: 14,
    data: [{ custom: {} }],
  });
});

Deno.test("enrich-get: an unfinished job returns its status with empty data", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "e", status: "IN_PROGRESS" } }]);
  const out = await action.execute!({ enrichmentId: "e" }, ctx) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals([out.status, out.credits, out.data], ["IN_PROGRESS", null, []]);
});

Deno.test("enrich-get: a 404 is thrown with the vendor code", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { code: "error.enrichment.not_found", message: "Enrichment ID not found" },
  }]);
  await assertRejects(
    async () => await action.execute!({ enrichmentId: "x" }, ctx),
    Error,
    "error.enrichment.not_found",
  );
});
