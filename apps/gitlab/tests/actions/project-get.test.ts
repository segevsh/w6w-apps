import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/project-get.ts";

Deno.test("project-get: GETs /projects/{encoded id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }]);
  await action.execute({ projectId: "group/project" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://gitlab.com/api/v4/projects/group%2Fproject");
});

Deno.test("project-get: passes a numeric id through unencoded", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 278964 } }]);
  await action.execute({ projectId: "278964" }, ctx);
  assertEquals(calls[0].url, "https://gitlab.com/api/v4/projects/278964");
});
