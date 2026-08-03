import { assertEquals } from "@std/assert";
import markLeadInterested from "../../actions/mark-lead-interested.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("mark-lead-interested: without a campaign, POSTs the all-campaigns route", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await markLeadInterested.execute!({ leadIdOrEmail: "lea_1" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/leads/interested/lea_1");
});

Deno.test("mark-lead-interested: with a campaign, POSTs the campaign-scoped route", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await markLeadInterested.execute!({ leadIdOrEmail: "lea_1", campaignId: "cam_1" }, ctx);
  assertEquals(
    new URL(calls[0].url).pathname,
    "/api/campaigns/cam_1/leads/lea_1/interested",
  );
});

Deno.test("mark-lead-interested: accepts an email as the identifier and encodes it", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await markLeadInterested.execute!({ leadIdOrEmail: "john@example.com" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/leads/interested/john%40example.com");
});
