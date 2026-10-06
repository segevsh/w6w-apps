import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-event-description.ts";

Deno.test("get-event-description: GET /events/{id}/description/", async () => {
  const { ctx, calls } = mockCtx([{ body: { description: "<p>x</p>" } }]);
  const out = await action.execute!({ eventId: "7" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/v3/events/7/description/");
  assertEquals(out, { description: "<p>x</p>" });
});
