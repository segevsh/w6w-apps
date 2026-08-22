import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/org-repo-list.ts";

const conn = { display: { baseUrl: "https://git.example.com" } };

Deno.test("org-repo-list: enumerates an organization's repositories", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ full_name: "acme/web" }] }], conn);
  assertEquals(await action.execute!({ org: "acme" }, ctx), [{ full_name: "acme/web" }]);
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/orgs/acme/repos");
});

Deno.test("org-repo-list: a blank organization fails before any request", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`org` is required");
  assertEquals(calls.length, 0);
});
