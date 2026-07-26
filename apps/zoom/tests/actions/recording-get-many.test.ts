import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/recording-get-many.ts";

Deno.test("recording-get-many: GETs the user's recordings with a date window", async () => {
  const { ctx, calls } = mockCtx([{ body: { meetings: [] } }]);
  await action.execute({ from: "2026-07-01", to: "2026-07-26" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v2/users/me/recordings");
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("from"), "2026-07-01");
  assertEquals(q.get("to"), "2026-07-26");
});

Deno.test("recording-get-many: documents Zoom's one-month window limit", () => {
  assert(action.description?.includes("one month"));
});
