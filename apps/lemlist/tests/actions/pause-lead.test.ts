import { assert, assertEquals } from "@std/assert";
import pauseLead from "../../actions/pause-lead.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("pause-lead: POSTs /leads/pause/{id} and sends campaignId as a QUERY param", async () => {
  // Unlike the interested pair, scoping here switches a query parameter rather
  // than the endpoint.
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await pauseLead.execute!({ leadId: "lea_1", campaignId: "cam_1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "POST");
  assertEquals(url.pathname, "/api/leads/pause/lea_1");
  assertEquals(url.searchParams.get("campaignId"), "cam_1");
});

Deno.test("pause-lead: omits campaignId entirely when unset, pausing everywhere", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await pauseLead.execute!({ leadId: "lea_1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/leads/pause/lea_1");
  assert(!url.searchParams.has("campaignId"));
});
