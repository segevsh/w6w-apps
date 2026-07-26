import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/repository-get.ts";

Deno.test("repository-get: GETs /repos/{owner}/{repo}", async () => {
  const { ctx, calls } = mockCtx([{ body: { full_name: "acme/api" } }]);
  await action.execute({ owner: "acme", repository: "api" }, ctx);
  assertEquals(calls[0].url, "https://api.github.com/repos/acme/api");
});
