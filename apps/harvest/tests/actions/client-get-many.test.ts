import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/client-get-many.ts";

Deno.test("client-get-many: GETs /clients with snake_case query params", async () => {
  const { ctx, calls } = mockCtx([{ body: { clients: [] } }]);
  await action.execute({ isActive: true }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/clients");
  assertEquals(url.searchParams.get("is_active"), "true");
});
