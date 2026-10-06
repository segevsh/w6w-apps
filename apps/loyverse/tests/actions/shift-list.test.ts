import { assertEquals } from "@std/assert";
import action from "../../actions/shift-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("shift-list: GET /shifts maps params to the vendor's query names", async () => {
  const { ctx, calls } = mockCtx([{ body: { shifts: [{ id: "a" }], cursor: "c2" } }]);
  const out = await action.execute({
    storeIds: "s1",
    createdAtMax: "2026-02-01T00:00:00.000Z",
    limit: 5,
  }, ctx) as { shifts: unknown[]; cursor?: string };
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1.0/shifts");
  assertEquals(queryOf(calls[0].url), {
    store_ids: "s1",
    created_at_max: "2026-02-01T00:00:00.000Z",
    limit: "5",
  });
  assertEquals(out.shifts.length, 1);
  assertEquals(out.cursor, "c2");
});

Deno.test("shift-list: no params sends no query string", async () => {
  const { ctx, calls } = mockCtx([{ body: { shifts: [] } }]);
  const out = await action.execute({}, ctx) as { cursor?: string };
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(out.cursor, undefined);
});
