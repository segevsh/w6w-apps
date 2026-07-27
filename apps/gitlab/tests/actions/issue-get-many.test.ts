import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/issue-get-many.ts";

Deno.test("issue-get-many: GETs /projects/{id}/issues with filters", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await action.execute(
    { projectId: "1", state: "opened", labels: "bug, p1", search: "crash", perPage: 10, page: 3 },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v4/projects/1/issues");
  assertEquals(url.searchParams.get("state"), "opened");
  assertEquals(url.searchParams.get("labels"), "bug,p1");
  assertEquals(url.searchParams.get("search"), "crash");
  assertEquals(url.searchParams.get("per_page"), "10");
  assertEquals(url.searchParams.get("page"), "3");
});
