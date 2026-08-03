import { assertEquals } from "@std/assert";
import { API, mockCtx, queryOf } from "../_helpers.ts";
import action from "../../actions/event-list.ts";

Deno.test("event-list: GETs /events", async () => {
  const { ctx, calls } = mockCtx([{ body: { records: [] } }]);
  await action.execute({}, ctx);
  assertEquals(calls[0].url, `${API}/events`);
});

/**
 * The parameter names carry literal brackets — `filter_date[start_date]` — and
 * are not a nested `filter_date` object. Serialising an object here would
 * produce a key the endpoint has never seen and silently filter nothing.
 */
Deno.test("event-list: the date filters are sent as bracketed keys, verbatim", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ startDate: "2026-01-01", endDate: "2026-12-31" }, ctx);
  const q = queryOf(calls[0]);
  assertEquals(q["filter_date[start_date]"], ["2026-01-01"]);
  assertEquals(q["filter_date[end_date]"], ["2026-12-31"]);
});

Deno.test("event-list: forwards space, sort and pagination", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ spaceId: 4, sort: "start_date", page: 1, perPage: 50 }, ctx);
  assertEquals(queryOf(calls[0]), {
    space_id: ["4"],
    sort: ["start_date"],
    page: ["1"],
    per_page: ["50"],
  });
});

Deno.test("event-list: the sort param has no default — Circle's default has no token", () => {
  // "default is newest (by created_at)" is a real behaviour with no enum value,
  // so blank is the only way to ask for it.
  assertEquals(action.params!.find((p) => p.key === "sort")!.default, undefined);
});

Deno.test("event-list: the date params are typed `date`, matching Circle's `format: date`", () => {
  assertEquals(action.params!.find((p) => p.key === "startDate")!.type, "date");
  assertEquals(action.params!.find((p) => p.key === "endDate")!.type, "date");
});
