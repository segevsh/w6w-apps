import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/project-create.ts";

Deno.test("project-create: POSTs /projects with mapped snake_case body", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "p1", name: "Work" } }]);
  await action.execute!({ name: "Work", isFavorite: true, viewStyle: "board" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/rest/v2/projects");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Work",
    is_favorite: true,
    view_style: "board",
  });
});
