import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/organization-get-repositories.ts";

Deno.test("organization-get-repositories: GETs /orgs/{org}/repos with the type filter", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await action.execute({ organization: "acme", type: "private" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/orgs/acme/repos");
  assertEquals(new URL(calls[0].url).searchParams.get("type"), "private");
});
