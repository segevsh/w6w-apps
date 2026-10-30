import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import projectList from "../../actions/project-list.ts";
import { mockCtx, odataList, pathOf, queryOf } from "../_helpers.ts";

test("project-list: calls GET /v1/Projects and forwards $expand", async () => {
  const { ctx, calls } = mockCtx([{ body: odataList([{ id: "pr1" }]) }]);
  const out = await projectList.execute({
    expand: "client($select=id,name),location($select=id,name)",
  }, ctx) as { items: unknown[] };
  assertEquals(pathOf(calls[0].url), "/v1/Projects");
  assertEquals(
    queryOf(calls[0].url)["$expand"],
    "client($select=id,name),location($select=id,name)",
  );
  assertEquals(out.items, [{ id: "pr1" }]);
});
