import { assertEquals } from "@std/assert";
import action from "../../actions/list-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("list-list: GET /lists wraps the array", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ ListName: "News", PublicListID: "p" }] }]);
  const out = await action.execute({ limit: 10 }, ctx) as { items: unknown[]; count: number };
  assertEquals(pathOf(calls[0].url), "/v4/lists");
  assertEquals(queryOf(calls[0].url), { limit: "10" });
  assertEquals(out.count, 1);
});
