import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import timezoneList from "../../actions/timezone-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("timezone-list: GETs the bare array and wraps it under items", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: [{ name: "Pacific/Midway", utc_offset: -39600 }] },
  ]);
  const out = await timezoneList.execute({}, ctx) as { items: unknown[] };
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/calevent/v2/timezones");
  assertEquals(out.items.length, 1);
});

test("timezone-list: does not require auth", () => {
  assertEquals(timezoneList.requiresAuth, false);
});
