import { assertEquals } from "@std/assert";
import workspaceList from "../../actions/workspace-list.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("workspace-list: GET /workspaces with limit and cursor", async () => {
  const ws = { id: "w1", name: "Main", plan: "BUNDLE_50000", submissionsQuota: 50000 };
  const { ctx, calls } = mockCtx([{ body: page([ws], { hasMore: true, nextCursor: "c2" }) }]);
  const out = await workspaceList.execute({ limit: 10, startingAfter: "c1" }, ctx) as {
    data: unknown[];
    hasMore: boolean;
    nextCursor: string;
  };
  assertEquals(pathOf(calls[0].url), "/public/v1/workspaces");
  assertEquals(queryOf(calls[0].url), { limit: "10", startingAfter: "c1" });
  assertEquals(out.data, [ws]);
  assertEquals(out.hasMore, true);
  assertEquals(out.nextCursor, "c2");
});

Deno.test("workspace-list: no params means a bare path", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);
  await workspaceList.execute({}, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});
