import { assertEquals } from "@std/assert";
import { mockOktaCtx } from "../_helpers.ts";
import action from "../../actions/user-list.ts";

Deno.test("user-list: GETs /users with q and limit", async () => {
  const { ctx, calls } = mockOktaCtx([{ body: [{ id: "1" }] }]);
  await action.execute({ q: "jane", limit: 10 }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://dev-1.okta.com/api/v1/users?q=jane&limit=10");
});

Deno.test("user-list: search filter takes the `search` query param", async () => {
  const { ctx, calls } = mockOktaCtx([{ body: [] }]);
  await action.execute({ search: 'profile.department eq "Eng"' }, ctx);
  assertEquals(
    calls[0].url,
    "https://dev-1.okta.com/api/v1/users?search=profile.department+eq+%22Eng%22",
  );
});
