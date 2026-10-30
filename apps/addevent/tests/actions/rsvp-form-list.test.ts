import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import rsvpFormList from "../../actions/rsvp-form-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("rsvp-form-list: GETs the bare array and wraps it under items", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: [{ id: "form-1", name: "Untitled RSVP form" }] },
  ]);
  const out = await rsvpFormList.execute({}, ctx) as { items: unknown[] };
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/calevent/v2/events/rsvp-forms");
  assertEquals(out.items.length, 1);
});

test("rsvp-form-list: an empty list stays an empty array, never undefined", async () => {
  const { ctx } = mockCtx([{ status: 200, body: [] }]);
  const out = await rsvpFormList.execute({}, ctx) as { items: unknown[] };
  assertEquals(out.items, []);
});
