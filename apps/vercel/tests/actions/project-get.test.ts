import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/project-get.ts";

test("project-get: accepts a project name as well as an ID", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "prj_1", name: "my-app" } }], {
    display: {},
  });
  const result = await action.execute!({ projectId: "my-app" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v9/projects/my-app");
  assertEquals(result, { id: "prj_1", name: "my-app" });
});

test("project-get: a blank project fails before any request", async () => {
  const { ctx, calls } = mockCtx([], { display: {} });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`projectId`");
  assertEquals(calls.length, 0);
});
