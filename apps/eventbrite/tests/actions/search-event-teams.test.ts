import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/search-event-teams.ts";

Deno.test("search-event-teams: GETs search with term", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  await action.execute!({ eventId: "e1", term: "red" }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3/events/e1/teams/search/");
  assertEquals(url.searchParams.get("term"), "red");
  assertEquals(calls[0].body, null);
});
