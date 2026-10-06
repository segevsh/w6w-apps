import { assertEquals } from "@std/assert";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";
import listDeleted from "../../actions/list-deleted-properties.ts";

Deno.test("list-deleted-properties: passes deletedSince and returns the id array", async () => {
  const { ctx, calls } = mockCtx([{ body: [3, 4] }]);
  const out = await listDeleted.execute({ deletedSince: "2026-02-01" }, ctx) as {
    items: number[];
  };
  assertEquals(pathOf(calls[0].url), "/v2/deletedproperties");
  assertEquals(queryOf(calls[0].url), { deletedSince: "2026-02-01" });
  assertEquals(out.items, [3, 4]);
});
