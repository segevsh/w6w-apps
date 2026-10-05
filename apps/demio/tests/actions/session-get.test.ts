import { assertEquals } from "@std/assert";
import sessionGet from "../../actions/session-get.ts";
import { API_ROOT, mockCtx } from "../_helpers.ts";

Deno.test("session-get: GET /event/{id}/date/{date_id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { date_id: 1218, status: "scheduled" } }]);
  const out = await sessionGet.execute({ eventId: 5, dateId: 1218 }, ctx);
  assertEquals(out, { date_id: 1218, status: "scheduled" });
  assertEquals(calls[0].url, `${API_ROOT}/event/5/date/1218`);
});
