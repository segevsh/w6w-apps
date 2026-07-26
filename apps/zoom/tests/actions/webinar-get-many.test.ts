import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/webinar-get-many.ts";

Deno.test("webinar-get-many: GETs the user's webinars", async () => {
  const { ctx, calls } = mockCtx([{ body: { webinars: [] } }]);
  await action.execute({ userId: "me", pageSize: 5 }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v2/users/me/webinars");
  assertEquals(new URL(calls[0].url).searchParams.get("page_size"), "5");
});
