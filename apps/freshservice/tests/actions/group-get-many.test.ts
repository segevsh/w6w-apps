import { assertEquals } from "@std/assert";
import { mockFreshserviceCtx } from "../_helpers.ts";
import action from "../../actions/group-get-many.ts";

Deno.test("group-get-many: GETs /groups and unwraps `groups`", async () => {
  const { ctx, calls } = mockFreshserviceCtx([{ body: { groups: [{ id: 1 }] } }]);
  const out = await action.execute({ workspaceId: 2 }, ctx);
  assertEquals(calls[0].url, "https://acme.freshservice.com/api/v2/groups?workspace_id=2");
  assertEquals(out, { groups: [{ id: 1 }] });
});
