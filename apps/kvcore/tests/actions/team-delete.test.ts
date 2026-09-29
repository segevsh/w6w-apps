import { assertEquals } from "@std/assert";
import teamDelete from "../../actions/team-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("team-delete: DELETEs /team/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  await teamDelete.execute({ team_id: "2" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v2/public/team/2");
});
