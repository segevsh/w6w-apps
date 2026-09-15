import { assertEquals } from "@std/assert";
import eventTemplateList from "../../actions/event-template-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("event-template-list: GETs and sends the type filter", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: [{ id: "tmpl-1", name: "Custom 1", template_type: "event-landing" }] },
  ]);
  const out = await eventTemplateList.execute({ type: "event-landing" }, ctx) as {
    items: unknown[];
  };
  assertEquals(pathOf(calls[0].url), "/calevent/v2/events/templates");
  assertEquals(queryOf(calls[0].url).type, "event-landing");
  assertEquals(out.items.length, 1);
});
