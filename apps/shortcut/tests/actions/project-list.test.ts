import { assertEquals } from "@std/assert";
import projectList from "../../actions/project-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("project-list: calls GET /projects", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1, name: "Website" }] }]);
  const out = await projectList.execute({}, ctx) as Array<{ name: string }>;

  assertEquals(pathOf(calls[0].url), "/api/v3/projects");
  assertEquals(out[0].name, "Website");
});
