import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-get-many.ts";

Deno.test("user-get-many: GETs /users with snake_case query params", async () => {
  const { ctx, calls } = mockCtx([{ body: { users: [] } }]);
  await action.execute({ updatedSince: "2026-01-01T00:00:00Z" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/users");
  assertEquals(url.searchParams.get("updated_since"), "2026-01-01T00:00:00Z");
});
