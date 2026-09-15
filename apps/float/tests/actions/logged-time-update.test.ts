import { assertEquals } from "@std/assert";
import loggedTimeUpdate from "../../actions/logged-time-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("logged-time-update - PATCHes /logged-time/{id} and returns a single object (not an array)", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { logged_time_id: "abc123", hours: 6 } }]);
  const out = await loggedTimeUpdate.execute({ logged_time_id: "abc123", hours: 6 }, ctx);
  assertEquals(pathOf(calls[0].url), "/v3/logged-time/abc123");
  assertEquals(JSON.parse(calls[0].body!), { hours: 6 });
  assertEquals(out, { logged_time_id: "abc123", hours: 6 });
});
