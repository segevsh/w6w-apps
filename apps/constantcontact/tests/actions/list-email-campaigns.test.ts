import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-email-campaigns.ts";

Deno.test("list-email-campaigns: GETs /v3/emails with the default limit", async () => {
  const { ctx, calls } = mockCtx([{ body: { campaigns: [] } }]);
  await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.pathname, "/v3/emails");
  assertEquals(url.searchParams.get("limit"), "50");
});

Deno.test("list-email-campaigns: forwards the updated_at date window", async () => {
  const { ctx, calls } = mockCtx([{ body: { campaigns: [] } }]);
  await action.execute!({
    afterDate: "2026-01-01T00:00:00Z",
    beforeDate: "2026-02-01T00:00:00Z",
    limit: 10,
    cursor: "abc",
  }, ctx);
  const p = new URL(calls[0].url).searchParams;
  assertEquals(p.get("after_date"), "2026-01-01T00:00:00Z");
  assertEquals(p.get("before_date"), "2026-02-01T00:00:00Z");
  assertEquals(p.get("limit"), "10");
  assertEquals(p.get("cursor"), "abc");
});

Deno.test("list-email-campaigns: omits the date window when not supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: { campaigns: [] } }]);
  await action.execute!({}, ctx);
  const p = new URL(calls[0].url).searchParams;
  assert(!p.has("after_date"));
  assert(!p.has("before_date"));
});

Deno.test("list-email-campaigns: lifts the cursor out of _links.next", async () => {
  const { ctx } = mockCtx([{
    body: {
      campaigns: [{ campaign_id: "e1", current_status: "Done" }],
      _links: { next: { href: "/v3/emails?limit=50&cursor=NEXT" } },
    },
  }]);
  const out = await action.execute!({}, ctx) as Record<string, unknown>;
  assertEquals(out.next_cursor, "NEXT");
});
