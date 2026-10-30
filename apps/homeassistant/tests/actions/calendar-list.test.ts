import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/calendar-list.ts";

test("calendar-list: returns the calendar entities and their ids", async () => {
  const { ctx, calls } = mockCtx([
    ok([
      { entity_id: "calendar.family", name: "Family" },
      { entity_id: "calendar.bins", name: "Bin collection" },
    ]),
  ], { display });
  const result = await action.execute!({}, ctx) as { count: number; entityIds: string[] };
  assertEquals(calls[0].url, "https://abc.ui.nabu.casa/api/calendars");
  assertEquals(result.count, 2);
  assertEquals(result.entityIds, ["calendar.family", "calendar.bins"]);
});

test("calendar-list: an instance with no calendars is a count of zero", async () => {
  const { ctx } = mockCtx([ok([])], { display });
  assertEquals(await action.execute!({}, ctx), { calendars: [], count: 0, entityIds: [] });
});

test("calendar-list: takes no parameters", () => {
  assertEquals(action.params?.length ?? 0, 0);
});

/** One API for Google, CalDAV and local calendars alike. */
test("calendar-list: says why this is a useful read surface", () => {
  assert(/one API for all of them/.test(action.description!), action.description);
});
