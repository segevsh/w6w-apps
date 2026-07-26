import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/meeting-update.ts";

Deno.test("meeting-update: PATCHes only the supplied fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await action.execute({ meetingId: "1", topic: "Renamed" }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), { topic: "Renamed" });
});

Deno.test("meeting-update: says plainly that Zoom returns no body", () => {
  assert(action.description?.includes("204"));
});
