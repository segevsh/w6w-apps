import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/category-delete.ts";

const input = { "category_id": 123 } as never;

Deno.test("category-delete: DELETE /categories/{category_id}", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "status": 200, "success": true, "data": { "id": 1 } },
  }]);
  const result = await action.execute!(input, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "DELETE");
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://api.salla.dev/admin/v2/categories/123");
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals(result, { deleted: true });
});

Deno.test("category-delete: a Salla error envelope throws with its message", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: {
      status: 422,
      success: false,
      error: { code: "error", message: "alert.invalid_fields", fields: { name: ["required"] } },
    },
  }]);
  let message = "";
  try {
    await action.execute!(input, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("alert.invalid_fields"), message);
  assert(message.includes("name: required"), message);
});
