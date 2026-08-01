import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/client-get-many.ts";

Deno.test("client-get-many: GETs /workspaces/{id}/clients with filters", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1, name: "Acme Co" }] }]);
  const result = await action.execute(
    { workspaceId: 123, status: "both", name: "Acme" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v9/workspaces/123/clients");
  assertEquals(url.searchParams.get("status"), "both");
  assertEquals(url.searchParams.get("name"), "Acme");
  assertEquals(result, [{ id: 1, name: "Acme Co" }]);
});
