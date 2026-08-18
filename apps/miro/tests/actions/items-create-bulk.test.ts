import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/items-create-bulk.ts";

Deno.test("items-create-bulk: posts the bare array Miro's schema declares", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { data: [] } }], { display: {} });
  await action.execute!({
    boardId: "b1",
    items: '[{"type":"sticky_note","data":{"content":"Hi"}}]',
  }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v2/boards/b1/items/bulk");
  assertEquals(JSON.parse(calls[0].body!), [{ type: "sticky_note", data: { content: "Hi" } }]);
});

Deno.test("items-create-bulk: Miro's 20-item cap is enforced by name", async () => {
  const { ctx, calls } = mockCtx([], { display: {} });
  const many = JSON.stringify(Array.from({ length: 21 }, () => ({ type: "text" })));
  await assertRejects(
    async () => await action.execute!({ boardId: "b1", items: many }, ctx),
    Error,
    "at most 20 items",
  );
  assertEquals(calls.length, 0);
});

Deno.test("items-create-bulk: an empty array is rejected first", async () => {
  const { ctx, calls } = mockCtx([], { display: {} });
  await assertRejects(
    async () => await action.execute!({ boardId: "b1", items: "[]" }, ctx),
    Error,
    "`items`",
  );
  assertEquals(calls.length, 0);
});
