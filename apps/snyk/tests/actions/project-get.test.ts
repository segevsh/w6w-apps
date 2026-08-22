import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/project-get.ts";

Deno.test("project-get: fetches one project", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: { id: "p1" } } }], {
    display: { orgId: "org-1" },
  });
  await action.execute!({ projectId: "p1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/rest/orgs/org-1/projects/p1");
});

Deno.test("project-get: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([], { display: { orgId: "org-1" } });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`projectId`");
  assertEquals(calls.length, 0);
});
