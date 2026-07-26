import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/meeting-get-many.ts";

Deno.test("meeting-get-many: GETs the user's meetings with the type filter", async () => {
  const { ctx, calls } = mockCtx([{ body: { meetings: [] } }]);
  await action.execute({ type: "upcoming", pageSize: 10 }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v2/users/me/meetings");
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("type"), "upcoming");
  assertEquals(q.get("page_size"), "10");
});

Deno.test("meeting-get-many: passes the page token through", async () => {
  const { ctx, calls } = mockCtx([{ body: { meetings: [] } }]);
  await action.execute({ nextPageToken: "tok" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("next_page_token"), "tok");
});
