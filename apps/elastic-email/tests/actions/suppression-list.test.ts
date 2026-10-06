import { assertEquals } from "@std/assert";
import action from "../../actions/suppression-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("suppression-list: GET /suppressions wraps the array", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ Email: "a@x.com", ErrorCode: 5 }] }]);
  const out = await action.execute({ offset: 3 }, ctx) as { items: unknown[]; count: number };
  assertEquals(pathOf(calls[0].url), "/v4/suppressions");
  assertEquals(queryOf(calls[0].url), { offset: "3" });
  assertEquals(out.count, 1);
});
