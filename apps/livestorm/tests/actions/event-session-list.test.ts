import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import eventSessionList from "../../actions/event-session-list.ts";
import { list, mockCtx, pathOf, queryOf, resource } from "../_helpers.ts";

test("event-session-list: lists sessions for an event with filters", async () => {
  const { ctx, calls } = mockCtx([{ body: list([resource("sessions", "s1")]) }]);
  await eventSessionList.execute({ id: "e1", status: "live", pageSize: 5 }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/events/e1/sessions");
  assertEquals(queryOf(calls[0].url), { "filter[status]": "live", "page[size]": "5" });
});
