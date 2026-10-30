import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import eventGet from "../../actions/event-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("event-get: metadata", () => {
  assertEquals(eventGet.type, "read");
});

test("event-get: GET /events/{eventId}, returns the object verbatim", async () => {
  const body = { id: "e1", name: "Coffee with P", startDate: 1522228026, endDate: 1522231626 };
  const { ctx, calls } = mockCtx([{ status: 200, body }]);
  const result = await eventGet.execute({ eventId: "e1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/crm/v1/events/e1");
  assertEquals(result, body);
});
