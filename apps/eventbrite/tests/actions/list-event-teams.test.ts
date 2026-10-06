import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-event-teams.ts";

Deno.test("list-event-teams: GETs teams", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  await action.execute!({ eventId: "e1", continuation: "c" }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3/events/e1/teams/");
  assertEquals(url.searchParams.get("continuation"), "c");
  assertEquals(calls[0].body, null);
});
