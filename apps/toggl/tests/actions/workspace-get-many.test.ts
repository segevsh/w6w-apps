import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/workspace-get-many.ts";

Deno.test("workspace-get-many: GETs /me/workspaces", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1, name: "Acme" }] }]);
  const result = await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v9/me/workspaces");
  assertEquals(calls[0].method, "GET");
  assertEquals(result, [{ id: 1, name: "Acme" }]);
});
