import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/meeting-update.ts";

test("meeting-update: PATCHes only the supplied fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await action.execute({ meetingId: "1", topic: "Renamed" }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), { topic: "Renamed" });
});

test("meeting-update: says plainly that Zoom returns no body", () => {
  assert(action.description?.includes("204"));
});
