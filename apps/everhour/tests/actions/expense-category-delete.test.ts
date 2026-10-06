import { assertEquals, assertRejects } from "@std/assert";
import expenseCategoryDelete from "../../actions/expense-category-delete.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("expense-category-delete: DELETE /expenses/categories/{categoryId} with the documented query and body", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await expenseCategoryDelete.execute({ "categoryId": 94, "targetCategory": 95 }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/expenses/categories/94");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), { "targetCategory": 95 });
  assertEquals(calls[0].headers["x-accept-version"], "1.2");
  assertEquals(
    calls[0].headers["x-api-key"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals(out, { "ok": true });
});

Deno.test("expense-category-delete: an Everhour error surfaces its message and status", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody(404, "Not found") }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        expenseCategoryDelete.execute({ "categoryId": 94, "targetCategory": 95 }, ctx),
      ),
    Error,
  );
  assertEquals(err.message.includes("404"), true, err.message);
  assertEquals(err.message.includes("Not found"), true, err.message);
});

Deno.test("expense-category-delete: declares perform and idempotent=true", () => {
  assertEquals(expenseCategoryDelete.type, "perform");
  assertEquals(expenseCategoryDelete.idempotent, true);
});
