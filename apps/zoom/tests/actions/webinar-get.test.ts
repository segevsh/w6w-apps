import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/webinar-get.ts";

Deno.test("webinar-get: GETs /webinars/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }]);
  await action.execute({ webinarId: "987654321" }, ctx);
  assertEquals(calls[0].url, "https://api.zoom.us/v2/webinars/987654321");
});
