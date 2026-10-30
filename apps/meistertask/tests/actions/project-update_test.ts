import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import projectUpdate from "../../actions/project-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("project-update: PUT /projects/:id with the given fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 7, status: 5 } }]);
  const out = await projectUpdate.execute({ id: 7, status: 5 }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/projects/7");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { status: 5 });
  assertEquals(out, { id: 7, status: 5 });
});
