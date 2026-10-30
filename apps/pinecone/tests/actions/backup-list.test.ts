import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/backup-list.ts";

test("backup-list: lists the project's backups", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [{ backup_id: "bk_1" }] } }]);
  const out = await action.execute!({}, ctx) as { data: unknown[] };
  assertEquals(out.data, [{ backup_id: "bk_1" }]);
  assertEquals(new URL(calls[0].url).pathname, "/backups");
});

test("backup-list: follows pagination when returning all", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { data: [{ backup_id: "a" }], pagination: { next: "tok" } } },
    { status: 200, body: { data: [{ backup_id: "b" }] } },
  ]);
  const out = await action.execute!({ returnAll: true }, ctx) as { data: unknown[] };
  assertEquals(out.data.length, 2);
  assertEquals(new URL(calls[1].url).searchParams.get("paginationToken"), "tok");
});
