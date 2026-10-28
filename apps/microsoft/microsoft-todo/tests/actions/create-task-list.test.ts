import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-task-list.ts";

Deno.test("create-task-list: POSTs displayName and nothing else", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "L1", displayName: "Groceries" } }]);
  await action.execute!({ displayName: "Groceries" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/todo/lists");
  assertEquals(JSON.parse(calls[0].body!), { displayName: "Groceries" });
  assertEquals(calls[0].headers["content-type"], "application/json");
});

Deno.test("create-task-list: is honestly non-idempotent — Graph mints a fresh id", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
});
