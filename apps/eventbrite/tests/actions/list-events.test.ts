import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-events.ts";

Deno.test("list-events: applies defaults (status=live, page_size=100, expand=venue,ticket_classes)", async () => {
  const body = { events: [], pagination: {} };
  const { ctx, calls } = mockCtx([{ body }]);
  await action.execute!({ organizationId: "acct-1" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3/organizations/acct-1/events/");
  assertEquals(url.searchParams.get("status"), "live");
  assertEquals(url.searchParams.get("page_size"), "100");
  assertEquals(url.searchParams.get("expand"), "venue,ticket_classes");
});

Deno.test("list-events: forwards all optional filters when provided", async () => {
  const { ctx, calls } = mockCtx([{ body: { events: [], pagination: {} } }]);
  await action.execute!(
    {
      organizationId: "acct-1",
      status: "live,draft",
      nameFilter: "party",
      timeFilter: "past",
      showSeriesParent: true,
      pageSize: 25,
      continuation: "cont-tok",
      expand: "logo",
    },
    ctx,
  );
  const params = new URL(calls[0].url).searchParams;
  assertEquals(params.get("status"), "live,draft");
  assertEquals(params.get("name_filter"), "party");
  assertEquals(params.get("time_filter"), "past");
  assertEquals(params.get("show_series_parent"), "true");
  assertEquals(params.get("page_size"), "25");
  assertEquals(params.get("continuation"), "cont-tok");
  assertEquals(params.get("expand"), "logo");
});

Deno.test("list-events: omits undefined optional filters", async () => {
  const { ctx, calls } = mockCtx([{ body: { events: [], pagination: {} } }]);
  await action.execute!({ organizationId: "acct-1" }, ctx);
  const params = new URL(calls[0].url).searchParams;
  assert(!params.has("name_filter"));
  assert(!params.has("time_filter"));
  assert(!params.has("continuation"));
});

Deno.test("list-events: scopeId works like organizationId by default", async () => {
  const { ctx, calls } = mockCtx([{ body: { events: [], pagination: {} } }]);
  await action.execute!({ scopeId: "acct-2", orderBy: "start_desc" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3/organizations/acct-2/events/");
  assertEquals(url.searchParams.get("order_by"), "start_desc");
});

Deno.test("list-events: venue scope", async () => {
  const { ctx, calls } = mockCtx([{ body: { events: [], pagination: {} } }]);
  await action.execute!(
    { scope: "venue", scopeId: "v1", status: "live,draft", onlyPublic: true, nameFilter: "x" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.pathname, "/v3/venues/v1/events/");
  assertEquals(url.searchParams.get("status"), "live,draft");
  assertEquals(url.searchParams.get("only_public"), "true");
  assert(!url.searchParams.has("name_filter"));
});

Deno.test("list-events: series scope", async () => {
  const { ctx, calls } = mockCtx([{ body: { events: [], pagination: {} } }]);
  await action.execute!(
    {
      scope: "series",
      scopeId: "s1",
      timeFilter: "past",
      startDateRangeStart: "2026-01-01T00:00:00Z",
      startDateRangeEnd: "2026-12-31T00:00:00Z",
      status: "live",
    },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3/series/s1/events/");
  assertEquals(url.searchParams.get("time_filter"), "past");
  assertEquals(url.searchParams.get("start_date.range_start"), "2026-01-01T00:00:00Z");
  assertEquals(url.searchParams.get("start_date.range_end"), "2026-12-31T00:00:00Z");
  assert(!url.searchParams.has("status"));
});

Deno.test("list-events: missing id throws", async () => {
  const { ctx } = mockCtx([]);
  let threw = false;
  try {
    await action.execute!({}, ctx);
  } catch {
    threw = true;
  }
  assert(threw);
});
