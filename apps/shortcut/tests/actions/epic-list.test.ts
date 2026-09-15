import { assertEquals } from "@std/assert";
import epicList from "../../actions/epic-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("epic-list: calls the paginated endpoint, not the unbounded one", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [], next: null, total: 0 } }]);
  await epicList.execute({ page: 2, pageSize: 10 }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v3/epics/paginated");
  assertEquals(queryOf(calls[0].url), { page: "2", page_size: "10" });
});

Deno.test("epic-list: returns the {data, next, total} envelope untouched", async () => {
  const { ctx } = mockCtx([{ body: { data: [{ id: 1 }], next: 2, total: 50 } }]);
  const out = await epicList.execute({}, ctx) as { data: unknown[]; next: number; total: number };

  assertEquals(out.total, 50);
  assertEquals(out.next, 2);
  assertEquals(out.data.length, 1);
});
