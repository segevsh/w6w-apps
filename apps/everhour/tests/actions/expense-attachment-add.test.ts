import { assertEquals, assertRejects } from "@std/assert";
import expenseAttachmentAdd from "../../actions/expense-attachment-add.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("expense-attachment-add: POST /expenses/{expenseId}/attachments with the documented query and body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { "id": 1, "name": "x" } }]);
  const out = await expenseAttachmentAdd.execute({
    "expenseId": 7810,
    "name": "a.png",
    "content": "aGk=",
  }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/expenses/7810/attachments");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "name": "a.png",
    "content": "aGk=",
  });
  assertEquals(calls[0].headers["x-accept-version"], "1.2");
  assertEquals(
    calls[0].headers["x-api-key"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals(out, { "id": 1, "name": "x" });
});

Deno.test("expense-attachment-add: an Everhour error surfaces its message and status", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody(404, "Not found") }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        expenseAttachmentAdd.execute(
          { "expenseId": 7810, "name": "a.png", "content": "aGk=" },
          ctx,
        ),
      ),
    Error,
  );
  assertEquals(err.message.includes("404"), true, err.message);
  assertEquals(err.message.includes("Not found"), true, err.message);
});

Deno.test("expense-attachment-add: declares perform and idempotent=false", () => {
  assertEquals(expenseAttachmentAdd.type, "perform");
  assertEquals(expenseAttachmentAdd.idempotent, false);
});
