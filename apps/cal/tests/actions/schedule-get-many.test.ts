import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/schedule-get-many.ts";

test("schedule-get-many: GETs /schedules with cal-api-version 2024-06-11", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  const result = await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/schedules");
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].headers["cal-api-version"], "2024-06-11");
  assertEquals(result, { data: [] });
});

test("schedule-get-many: takes no query parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.search, "");
});
