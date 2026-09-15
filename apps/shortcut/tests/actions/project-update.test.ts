import { assertEquals } from "@std/assert";
import projectUpdate from "../../actions/project-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("project-update: PUTs only the fields provided", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 42 } }]);
  await projectUpdate.execute({ projectId: 42, archived: true }, ctx);

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/api/v3/projects/42");
  assertEquals(JSON.parse(calls[0].body!), { archived: true });
});
