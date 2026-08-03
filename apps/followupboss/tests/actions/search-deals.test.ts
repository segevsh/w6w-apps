import { assert, assertEquals } from "@std/assert";
import { mockCtx, optionValues, run } from "../_helpers.ts";
import searchDeals from "../../actions/search-deals.ts";
import { DEAL_STATUSES } from "../../lib/client.ts";

Deno.test("search-deals: GETs /deals with the documented filters", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { _metadata: { collection: "deals", totalByStageId: { "5": 1 } }, deals: [{ id: 2146 }] },
  }]);
  const result = await run<{ records: unknown[]; metadata: Record<string, unknown> }>(
    searchDeals,
    { pipelineId: 100, personId: 10, status: "Active" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/deals");
  assertEquals(url.searchParams.get("pipelineId"), "100");
  assertEquals(url.searchParams.get("personId"), "10");
  assertEquals(url.searchParams.get("status"), "Active");
  assertEquals(result.records.length, 1);
  // `totalByStageId` is extra metadata this endpoint adds; it must survive.
  assertEquals(result.metadata.totalByStageId, { "5": 1 });
});

/**
 * The docs specify the integer `1` for these two, not a boolean. Exposed as
 * booleans for a sane form, converted on the way out.
 */

/**
 * The docs specify the integer `1` for these two, not a boolean. Exposed as
 * booleans for a sane form, converted on the way out.
 */
Deno.test("search-deals: converts the include flags to the documented integer 1", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { deals: [] } }]);
  await searchDeals.execute({ includeDeleted: true, includeArchived: true }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("includeDeleted"), "1");
  assertEquals(url.searchParams.get("includeArchived"), "1");
});

Deno.test("search-deals: omits the include flags entirely when false", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { deals: [] } }]);
  await searchDeals.execute({ includeDeleted: false }, ctx);
  assert(!new URL(calls[0].url).searchParams.has("includeDeleted"));
});

Deno.test("search-deals: offers exactly the three documented statuses", () => {
  assertEquals(optionValues(searchDeals, "status"), [...DEAL_STATUSES]);
});
