import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/release-get-many.ts";

Deno.test("release-get-many: GETs /projects/{id}/releases with sort options", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await action.execute({ projectId: "1", orderBy: "released_at", sort: "desc", perPage: 20 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v4/projects/1/releases");
  assertEquals(url.searchParams.get("order_by"), "released_at");
  assertEquals(url.searchParams.get("sort"), "desc");
  assertEquals(url.searchParams.get("per_page"), "20");
});
