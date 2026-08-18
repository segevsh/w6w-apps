import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/release-list.ts";

const display = { organizationSlug: "acme" };

Deno.test("release-list: lists releases with project and query filters", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ version: "1.0.0" }] }], { display });
  const result = await action.execute!({ projects: "web,api", query: "1.0" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/0/organizations/acme/releases/");
  assertEquals(url.searchParams.getAll("project"), ["web", "api"]);
  assertEquals(url.searchParams.get("query"), "1.0");
  assertEquals(result, [{ version: "1.0.0" }]);
});
