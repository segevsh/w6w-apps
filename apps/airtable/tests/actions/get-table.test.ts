import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-table.ts";

test("get-table: matches by id", async () => {
  const body = {
    tables: [
      { id: "tbl1", name: "Users" },
      { id: "tbl2", name: "Orders" },
    ],
  };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ baseId: "appABC", table: "tbl2" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v0/meta/bases/appABC/tables");
  assertEquals(result, { id: "tbl2", name: "Orders" });
});

test("get-table: matches by name", async () => {
  const body = {
    tables: [
      { id: "tbl1", name: "Users" },
      { id: "tbl2", name: "Orders" },
    ],
  };
  const { ctx } = mockCtx([{ body }]);
  const result = await action.execute!({ baseId: "appABC", table: "Users" }, ctx);
  assertEquals(result, { id: "tbl1", name: "Users" });
});

test("get-table: throws when no table matches", async () => {
  const { ctx } = mockCtx([{ body: { tables: [{ id: "tbl1", name: "Users" }] } }]);
  await assertRejects(
    async () => await action.execute!({ baseId: "appABC", table: "Missing" }, ctx),
    Error,
    "no table matching",
  );
});
