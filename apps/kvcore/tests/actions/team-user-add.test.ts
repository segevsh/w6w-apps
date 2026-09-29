import { assertEquals } from "@std/assert";
import teamUserAdd from "../../actions/team-user-add.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("team-user-add: posts user_id and coerces is_admin to 1/0 when given", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  await teamUserAdd.execute({ team_id: "2", user_id: "123", is_admin: true }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/public/team/2/user");
  assertEquals(JSON.parse(calls[0].body!), { user_id: "123", is_admin: 1 });
});

/** Unlike office-user-add, is_admin is optional — omitting it omits the field entirely. */
Deno.test("team-user-add: is_admin can be omitted, unlike office-user-add", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  await teamUserAdd.execute({ team_id: "2", user_id: "123" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { user_id: "123" });

  const required = (teamUserAdd.params ?? []).filter((p) => p.required).map((p) => p.key);
  assertEquals(required.sort(), ["team_id", "user_id"]);
});
