import { assertEquals } from "@std/assert";
import userDelete from "../../actions/user-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("user-delete: DELETEs /user/{id} with no body when no reassignment is given", async () => {
  const { ctx, calls } = mockCtx([{
    body: { message: "User Jane Doe has been successfully deleted" },
  }]);
  await userDelete.execute({ user_id: "1" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v2/public/user/1");
  assertEquals(calls[0].body, null);
});

Deno.test("user-delete: with a reassignment target, sends it as the body", async () => {
  const { ctx, calls } = mockCtx([{ body: { message: "ok" } }]);
  await userDelete.execute({ user_id: "1", assign_to_agent_id: "2" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { assign_to_agent_id: "2" });
});
