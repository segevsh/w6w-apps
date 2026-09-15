import { assertEquals } from "@std/assert";
import projectGet from "../../actions/project-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("project-get - GETs /projects/{id} with expand forwarded", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { project_id: 4 } }]);
  const out = await projectGet.execute({ project_id: 4, expand: ["phases", "currency"] }, ctx);
  assertEquals(pathOf(calls[0].url), "/v3/projects/4");
  assertEquals(queryOf(calls[0].url).expand, "phases,currency");
  assertEquals(out, { project_id: 4 });
});
