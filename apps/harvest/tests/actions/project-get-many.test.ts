import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/project-get-many.ts";

Deno.test("project-get-many: GETs /projects with snake_case query params", async () => {
  const { ctx, calls } = mockCtx([{ body: { projects: [] } }]);
  await action.execute({ isActive: true, clientId: "9" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/projects");
  assertEquals(url.searchParams.get("is_active"), "true");
  assertEquals(url.searchParams.get("client_id"), "9");
});
