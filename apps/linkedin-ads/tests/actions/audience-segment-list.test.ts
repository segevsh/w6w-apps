import { assertEquals } from "@std/assert";
import audienceSegmentList from "../../actions/audience-segment-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("audience-segment-list: q=account with the account URN, index-paginated (start/count)", async () => {
  const { ctx, calls } = mockCtx([{
    body: { elements: [], paging: { start: 0, count: 10, total: 0 } },
  }]);
  await audienceSegmentList.execute({ accountId: "516848833" }, ctx);

  assertEquals(pathOf(calls[0].url), "/rest/dmpSegments");
  const q = queryOf(calls[0].url);
  assertEquals(q.q, "account");
  assertEquals(q.account, "urn:li:sponsoredAccount:516848833");
  assertEquals(q.start, "0");
  assertEquals(q.count, "10");
});

Deno.test("audience-segment-list: sourcePlatform/sourceSegmentId narrow the query when set", async () => {
  const { ctx, calls } = mockCtx([{ body: { elements: [] } }]);
  await audienceSegmentList.execute(
    { accountId: "1", sourcePlatform: "PARTNER_API", sourceSegmentId: "ext-42" },
    ctx,
  );
  const q = queryOf(calls[0].url);
  assertEquals(q.sourcePlatform, "PARTNER_API");
  assertEquals(q.sourceSegmentId, "ext-42");
});

Deno.test("audience-segment-list: returns the elements/paging body verbatim", async () => {
  const body = {
    elements: [{ id: 10804, name: "Test DMP Segment 1" }],
    paging: { start: 0, count: 10, total: 1 },
  };
  const { ctx } = mockCtx([{ body }]);
  assertEquals(await audienceSegmentList.execute({ accountId: "1" }, ctx), body);
});
