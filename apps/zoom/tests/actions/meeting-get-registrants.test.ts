import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/meeting-get-registrants.ts";

test("meeting-get-registrants: GETs the registrants with the status filter", async () => {
  const { ctx, calls } = mockCtx([{ body: { registrants: [] } }]);
  await action.execute({ meetingId: "1", status: "pending" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v2/meetings/1/registrants");
  assertEquals(new URL(calls[0].url).searchParams.get("status"), "pending");
});
