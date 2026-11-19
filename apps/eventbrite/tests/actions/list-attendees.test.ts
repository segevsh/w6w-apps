import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-attendees.ts";

test("list-attendees: scope=event routes to /events/{id}/attendees/", async () => {
  const body = { attendees: [], pagination: {} };
  const { ctx, calls } = mockCtx([{ body }]);
  await action.execute!({ scope: "event", scopeId: "evt-1" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3/events/evt-1/attendees/");
  assertEquals(url.searchParams.get("page_size"), null); // blank Page size: Eventbrite's default
});

test("list-attendees: scope=organization + full filters", async () => {
  const { ctx, calls } = mockCtx([{ body: { attendees: [], pagination: {} } }]);
  await action.execute!(
    {
      scope: "organization",
      scopeId: "acct-1",
      status: "attending",
      changedSince: "2026-01-01T00:00:00Z",
      pageSize: 25,
      continuation: "c1",
    },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3/organizations/acct-1/attendees/");
  const p = url.searchParams;
  assertEquals(p.get("status"), "attending");
  assertEquals(p.get("changed_since"), "2026-01-01T00:00:00Z");
  assertEquals(p.get("page_size"), null); // the organization endpoint answers 400 to page_size
  assertEquals(p.get("continuation"), "c1");
});
