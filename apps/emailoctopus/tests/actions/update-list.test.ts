import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import action from "../../actions/update-list.ts";
import { mockCtx } from "../_helpers.ts";

test("update-list: PUTs { name } to /lists/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "l1", name: "Renamed" } }]);
  await action.execute!({ listId: "l1", name: "Renamed" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/lists/l1");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { name: "Renamed" });
});

test("update-list: sends only `name` — nothing else is accepted by v2", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ listId: "l1", name: "Renamed" }, ctx);
  assertEquals(Object.keys(JSON.parse(calls[0].body!)), ["name"]);
  assertEquals(action.idempotent, true);
});
