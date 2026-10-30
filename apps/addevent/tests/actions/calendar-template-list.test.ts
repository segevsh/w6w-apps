import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import calendarTemplateList from "../../actions/calendar-template-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

test("calendar-template-list: GETs and sends the type filter", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: [{ id: "tmpl-1", name: "Custom 1", template_type: "calendar-embed" }] },
  ]);
  const out = await calendarTemplateList.execute({ type: "calendar-embed" }, ctx) as {
    items: unknown[];
  };
  assertEquals(pathOf(calls[0].url), "/calevent/v2/calendars/templates");
  assertEquals(queryOf(calls[0].url).type, "calendar-embed");
  assertEquals(out.items.length, 1);
});
