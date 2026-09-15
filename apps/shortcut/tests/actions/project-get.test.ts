import { assertEquals } from "@std/assert";
import projectGet from "../../actions/project-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("project-get: calls GET /projects/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 42, name: "Website" } }]);
  const out = await projectGet.execute({ projectId: 42 }, ctx) as { name: string };

  assertEquals(pathOf(calls[0].url), "/api/v3/projects/42");
  assertEquals(out.name, "Website");
});
