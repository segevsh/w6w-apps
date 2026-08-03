import { assertEquals } from "@std/assert";
import { API, mockCtx, queryOf } from "../_helpers.ts";
import action from "../../actions/event-get.ts";

Deno.test("event-get: GETs /events/{id} with the id alone", async () => {
  // Unlike DELETE /events/{id}, this route does NOT take a space_id.
  const { ctx, calls } = mockCtx([{ body: { id: 2, name: "Launch" } }]);
  const out = await action.execute({ eventId: 2 }, ctx);
  assertEquals(calls[0].url, `${API}/events/2`);
  assertEquals(queryOf(calls[0]), {});
  assertEquals(out, { id: 2, name: "Launch" });
});

Deno.test("event-get: takes only the event id", () => {
  assertEquals(action.params!.map((p) => p.key), ["eventId"]);
});
