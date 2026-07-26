import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/webinar-create.ts";

Deno.test("webinar-create: POSTs /users/me/webinars with the webinar type", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }]);
  await action.execute({ topic: "Launch" }, ctx);
  assertEquals(calls[0].url, "https://api.zoom.us/v2/users/me/webinars");
  // 5 is a scheduled WEBINAR; a meeting's scheduled type is 2.
  assertEquals(JSON.parse(calls[0].body!), { topic: "Launch", type: 5 });
});

Deno.test("webinar-create: flags the add-on requirement", () => {
  assert(action.description?.includes("Webinar add-on"));
});
