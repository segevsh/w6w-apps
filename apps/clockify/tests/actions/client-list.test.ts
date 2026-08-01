import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/client-list.ts";

Deno.test("client-list: GETs /workspaces/{id}/clients", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "c1" }] }]);
  const result = await action.execute({ workspaceId: "ws1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/workspaces/ws1/clients");
  assertEquals(result, { items: [{ id: "c1" }] });
});
