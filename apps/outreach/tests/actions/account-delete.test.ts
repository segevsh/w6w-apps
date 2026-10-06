import { assertEquals, assertRejects } from "@std/assert";
import accountDelete from "../../actions/account-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("account-delete: DELETE /accounts/{id} and report deleted on 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await accountDelete.execute({ id: 5 }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/v2/accounts/5");
  assertEquals(calls[0].body, null);
  assertEquals(out, { deleted: true, id: 5 });
});

Deno.test("account-delete: id 0 is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await accountDelete.execute({ id: 0 }, ctx),
    Error,
    "positive integer",
  );
  assertEquals(calls.length, 0);
});

Deno.test("account-delete: a 422 is reported with its pointer", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: {
      errors: [{
        id: "validationError",
        title: "Validation Error",
        detail: "Cannot be deleted.",
        source: { pointer: "/data" },
      }],
    },
  }]);
  await assertRejects(
    async () => await accountDelete.execute({ id: 5 }, ctx),
    Error,
    "validationError: Cannot be deleted. (/data)",
  );
});
