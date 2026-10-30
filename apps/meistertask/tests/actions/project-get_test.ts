import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import projectGet from "../../actions/project-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("project-get: GET /projects/:id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 123, name: "Demo" } }]);
  const out = await projectGet.execute({ id: 123 }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/projects/123");
  assertEquals(calls[0].method, "GET");
  assertEquals(out, { id: 123, name: "Demo" });
});
