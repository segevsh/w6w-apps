import { assertEquals } from "@std/assert";
import action from "../../actions/tag-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("tag-list: GETs /tags/{domainId} with paging", async () => {
  const { ctx, calls } = mockCtx([{ body: { tags: ["a"], nextPageToken: null } }]);
  const out = await action.execute({ domainId: 7, prefix: "a", pageToken: "p" }, ctx);
  assertEquals(pathOf(calls[0].url), "/tags/7");
  assertEquals(queryOf(calls[0].url), { prefix: "a", limit: "100", pageToken: "p" });
  assertEquals(out, { tags: ["a"], nextPageToken: null });
});
