import { assertEquals } from "@std/assert";
import projectUpdate from "../../actions/project-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("project-update - PATCHes /projects/{id} with only provided fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { project_id: 3, name: "Renamed" } }]);
  const out = await projectUpdate.execute({ project_id: 3, name: "Renamed", active: false }, ctx);
  assertEquals(pathOf(calls[0].url), "/v3/projects/3");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), { name: "Renamed", active: 0 });
  assertEquals(out, { project_id: 3, name: "Renamed" });
});
