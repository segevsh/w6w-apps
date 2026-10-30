import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-notebook.ts";

test("create-notebook: POSTs { displayName } to /me/onenote/notebooks", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "n1", displayName: "My notebook" } }]);
  const out = await action.execute({ displayName: "My notebook" }, ctx) as { id: string };
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/onenote/notebooks");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { displayName: "My notebook" });
  assertEquals(out.id, "n1");
});

test("create-notebook: mints a new resource each call — not idempotent", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
});
