import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import sectionCreate from "../../actions/section-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("section-create: POST /projects/:project_id/sections", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 72, name: "New section" } }]);
  const out = await sectionCreate.execute({ projectId: 39, name: "New section" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/projects/39/sections");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { name: "New section" });
  assertEquals(out, { id: 72, name: "New section" });
});
