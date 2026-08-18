import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/card-create.ts";

Deno.test("card-create: sends the card's data fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "i1" } }], { display: {} });
  await action.execute!({
    boardId: "b1",
    title: "Fix login",
    description: "500 on submit",
    dueDate: "2026-09-01T00:00:00Z",
  }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v2/boards/b1/cards");
  assertEquals(JSON.parse(calls[0].body!), {
    data: { title: "Fix login", description: "500 on submit", dueDate: "2026-09-01T00:00:00Z" },
  });
});

Deno.test("card-create: a title is required", async () => {
  const { ctx, calls } = mockCtx([], { display: {} });
  await assertRejects(async () => await action.execute!({ boardId: "b1" }, ctx), Error, "`title`");
  assertEquals(calls.length, 0);
});
