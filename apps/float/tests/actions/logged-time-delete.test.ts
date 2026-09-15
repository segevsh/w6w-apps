import { assertEquals } from "@std/assert";
import loggedTimeDelete from "../../actions/logged-time-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("logged-time-delete - DELETEs /logged-time/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await loggedTimeDelete.execute({ logged_time_id: "abc123" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v3/logged-time/abc123");
  assertEquals(out, { deleted: true, logged_time_id: "abc123" });
});
