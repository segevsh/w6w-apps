import { assertEquals } from "@std/assert";
import action from "../../actions/list-verify-lists.ts";
import { mockCtx, run } from "../_helpers.ts";

const page = {
  body: {
    data: [{ list_id: "l1", name: "a.csv" }],
    page_info: { limit: 10, has_more: true, last_cursor: "CUR" },
  },
};

Deno.test("list-verify-lists: first page sends start_after null and no filter", async () => {
  const { ctx, calls } = mockCtx([page]);
  const out = await run(action, {}, ctx);
  assertEquals(calls[0].url, "https://api.clearout.io/v2/email_verify/list");
  assertEquals(JSON.parse(calls[0].body!), { start_after: null });
  assertEquals(out, {
    lists: [{ list_id: "l1", name: "a.csv" }],
    hasMore: true,
    nextCursor: "CUR",
  });
});

Deno.test("list-verify-lists: filters and the cursor are mapped to the vendor's body", async () => {
  const { ctx, calls } = mockCtx([page]);
  await run(action, {
    limit: 50,
    startAfter: "CUR",
    dateRange: "ps_today",
    status: "verified",
    type: "hubspot",
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    limit: 50,
    start_after: "CUR",
    filter: { date_range: "ps_today", verified: "verified", type: "hubspot" },
  });
});

Deno.test("list-verify-lists: an empty last page reports no more and a null cursor", async () => {
  const { ctx } = mockCtx([{
    body: { data: [], page_info: { has_more: false, last_cursor: null } },
  }]);
  assertEquals(await run(action, {}, ctx), { lists: [], hasMore: false, nextCursor: null });
});
