import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/webinar-get.ts";

test("webinar-get: GETs /webinars/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }]);
  await action.execute({ webinarId: "987654321" }, ctx);
  assertEquals(calls[0].url, "https://api.zoom.us/v2/webinars/987654321");
});
