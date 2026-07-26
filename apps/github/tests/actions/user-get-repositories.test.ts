import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-get-repositories.ts";

Deno.test("user-get-repositories: GETs /users/{login}/repos", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1 }] }]);
  assertEquals(await action.execute({ username: "acme" }, ctx), [{ id: 1 }]);
  assertEquals(new URL(calls[0].url).pathname, "/users/acme/repos");
});

Deno.test("user-get-repositories: encodes the username into the path", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await action.execute({ username: "a/b" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/users/a%2Fb/repos");
});
