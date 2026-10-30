import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/meeting-get.ts";

test("meeting-get: GETs /meetings/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }]);
  await action.execute({ meetingId: "123456789" }, ctx);
  assertEquals(calls[0].url, "https://api.zoom.us/v2/meetings/123456789");
});

test("meeting-get: takes the id as a string — Zoom ids exceed safe integers", () => {
  const p = action.params?.find((x) => x.key === "meetingId");
  assertEquals(p?.type, "string");
  assert(p?.hint?.includes("safe integer"));
});
