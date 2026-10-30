import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-update.ts";

test("list-update: PATCH /marketing/lists/{id} with { name }", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { id: "list-1", name: "Renamed" } },
  ]);
  const result = await action.execute!({ listId: "list-1", name: "Renamed" }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(calls[0].url, "https://api.sendgrid.com/v3/marketing/lists/list-1");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body ?? ""), { name: "Renamed" });
  assertEquals(result, { id: "list-1", name: "Renamed" });
});

test("list-update: missing listId rejects", async () => {
  const { ctx } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ listId: "", name: "x" }, ctx),
    Error,
    "`listId`",
  );
});

test("list-update: missing name rejects", async () => {
  const { ctx } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ listId: "l", name: "" }, ctx),
    Error,
    "`name`",
  );
});
