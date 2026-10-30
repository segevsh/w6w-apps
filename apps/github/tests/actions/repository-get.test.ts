import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/repository-get.ts";

test("repository-get: GETs /repos/{owner}/{repo}", async () => {
  const { ctx, calls } = mockCtx([{ body: { full_name: "acme/api" } }]);
  await action.execute({ owner: "acme", repository: "api" }, ctx);
  assertEquals(calls[0].url, "https://api.github.com/repos/acme/api");
});
