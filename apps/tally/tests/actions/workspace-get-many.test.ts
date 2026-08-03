import { assertEquals } from "@std/assert";
import { listBody, mockCtx } from "../_helpers.ts";
import action from "../../actions/workspace-get-many.ts";

Deno.test("workspace-get-many: GETs /workspaces and unwraps the envelope", async () => {
  const { ctx, calls } = mockCtx([
    { body: listBody([{ id: "w1" }], { total: 1, hasMore: true, page: 2 }) },
  ]);
  const result = await action.execute({ page: 2 }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/workspaces");
  assertEquals(url.searchParams.get("page"), "2");
  assertEquals(result.items, [{ id: "w1" }]);
  assertEquals(result.total, 1);
  assertEquals(result.hasMore, true);
});

Deno.test("workspace-get-many: omits unset params and tolerates a missing items array", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const result = await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(result.items, []);
});

Deno.test("workspace-get-many: offers no limit param — Tally documents none here", () => {
  assertEquals(action.params?.map((p) => p.key), ["page"]);
});
