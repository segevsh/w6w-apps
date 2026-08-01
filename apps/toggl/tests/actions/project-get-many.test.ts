import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/project-get-many.ts";

Deno.test("project-get-many: GETs /workspaces/{id}/projects with filters", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1, name: "Website" }] }]);
  const result = await action.execute(
    { workspaceId: 123, active: "both", clientId: 9 },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v9/workspaces/123/projects");
  assertEquals(url.searchParams.get("active"), "both");
  assertEquals(url.searchParams.get("client_ids"), "9");
  assertEquals(result, [{ id: 1, name: "Website" }]);
});
