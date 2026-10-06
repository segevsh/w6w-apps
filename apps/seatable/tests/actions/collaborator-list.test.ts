import { assertEquals } from "@std/assert";
import collaboratorList from "../../actions/collaborator-list.ts";
import { BASE_PATH, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("collaborator-list: GETs /related-users/", async () => {
  const { ctx, calls } = mockCtx([{ body: { user_list: [{ email: "a@auth.local", name: "A" }] } }]);
  const out = await collaboratorList.execute({}, ctx) as { user_list: unknown[] };
  assertEquals(pathOf(calls[0].url), `${BASE_PATH}/related-users/`);
  assertEquals(calls[0].method, "GET");
  assertEquals(out.user_list.length, 1);
});
