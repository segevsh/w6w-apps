import { assertEquals, assertRejects } from "@std/assert";
import bankAccountDelete from "../../actions/bank-account-delete.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("bank-account-delete: sends DELETE to the resource and returns Lob's confirmation", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "bank_abc", deleted: true } }]);
  const out = await bankAccountDelete.execute({ bankAccountId: "bank_abc" }, ctx) as {
    id: string;
    deleted: boolean;
  };
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v1/bank_accounts/bank_abc");
  assertEquals(calls[0].body, null);
  assertEquals(out, { id: "bank_abc", deleted: true });
});

Deno.test("bank-account-delete: is declared idempotent", () => {
  assertEquals(bankAccountDelete.idempotent, true);
});

Deno.test("bank-account-delete: a refused delete surfaces Lob's code", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: errorBody("not_deletable", "cannot be deleted", 422),
  }]);
  await assertRejects(
    async () => await bankAccountDelete.execute({ bankAccountId: "bank_abc" }, ctx),
    Error,
    "not_deletable",
  );
});
