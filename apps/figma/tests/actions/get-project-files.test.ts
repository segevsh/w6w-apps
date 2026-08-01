import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-project-files.ts";

Deno.test("get-project-files: GETs /v1/projects/{projectId}/files", async () => {
  const { ctx, calls } = mockCtx([{ body: { name: "Project", files: [] } }]);
  await action.execute({ projectId: "p1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/projects/p1/files");
  assertEquals(calls[0].method, "GET");
});

Deno.test("get-project-files: forwards branch_data", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ projectId: "p1", branchData: true }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("branch_data"), "true");
});
