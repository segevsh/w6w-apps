import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import memberDelete from "../../actions/member-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("member-delete: DELETEs People(id) — a real hard delete, unlike time-entry-archive", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  const out = await memberDelete.execute({ personId: "p1" }, ctx) as { ok: boolean };
  assertEquals(pathOf(calls[0].url), "/v1/People(p1)");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out.ok, true);
});
