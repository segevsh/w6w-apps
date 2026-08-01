import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/entry-delete.ts";

const display = { endpoint: "https://example.com" };

Deno.test("entry-delete: DELETEs /api/<collection>/<id>", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: { id: 1 } } }], { display });
  await action.execute({ collection: "articles", id: "1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/api/articles/1");
});

Deno.test("entry-delete: is declared idempotent", () => {
  assertEquals(action.idempotent, true);
});
