import { assert, assertEquals } from "@std/assert";
import markLeadNotInterested from "../../actions/mark-lead-not-interested.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("mark-lead-not-interested: the path segment is `notinterested` — one lowercase word", async () => {
  // lemlist camelCases `notInterested` as a lead STATE but flattens it in the
  // URL. Getting this wrong is a 404.
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await markLeadNotInterested.execute!({ leadIdOrEmail: "lea_1" }, ctx);
  const path = new URL(calls[0].url).pathname;
  assertEquals(path, "/api/leads/notinterested/lea_1");
  assert(!path.includes("not-interested"));
  assert(!path.includes("notInterested"));
});

Deno.test("mark-lead-not-interested: campaign-scoped route keeps the same spelling", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await markLeadNotInterested.execute!({ leadIdOrEmail: "lea_1", campaignId: "cam_1" }, ctx);
  assertEquals(
    new URL(calls[0].url).pathname,
    "/api/campaigns/cam_1/leads/lea_1/notinterested",
  );
});
