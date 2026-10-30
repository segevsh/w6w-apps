import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/meeting-delete.ts";

test("meeting-delete: DELETEs the meeting", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await action.execute({ meetingId: "1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/v2/meetings/1");
});

test("meeting-delete: targets one occurrence when given an occurrence id", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await action.execute({ meetingId: "1", occurrenceId: "occ-1" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("occurrence_id"), "occ-1");
});
