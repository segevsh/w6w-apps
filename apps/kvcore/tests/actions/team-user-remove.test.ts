import { assertEquals } from "@std/assert";
import teamUserRemove from "../../actions/team-user-remove.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("team-user-remove: DELETEs /team/{team_id}/user/{user_id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  await teamUserRemove.execute({ team_id: "2", user_id: "123" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v2/public/team/2/user/123");
});
