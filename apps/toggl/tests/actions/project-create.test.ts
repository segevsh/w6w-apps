import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/project-create.ts";

Deno.test("project-create: POSTs /workspaces/{id}/projects with the given fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, name: "Website" } }]);
  await action.execute(
    { workspaceId: 123, name: "Website", clientId: 9, isPrivate: false, active: true },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v9/workspaces/123/projects");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Website",
    client_id: 9,
    is_private: false,
    active: true,
  });
});
