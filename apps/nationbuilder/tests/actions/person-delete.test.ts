import { assertEquals, assertRejects } from "@std/assert";
import { mockNationBuilderCtx } from "../_helpers.ts";
import action from "../../actions/person-delete.ts";

Deno.test("person-delete: refuses without an explicit confirm", async () => {
  const { ctx } = mockNationBuilderCtx([]);
  await assertRejects(
    async () => {
      await action.execute({ personId: "42", confirm: false }, ctx);
    },
    Error,
    "confirm",
  );
});

Deno.test("person-delete: DELETEs /signups/{id} once confirmed", async () => {
  const { ctx, calls } = mockNationBuilderCtx([{ status: 204 }]);
  const out = await action.execute({ personId: "42", confirm: true }, ctx);
  assertEquals(calls[0].url, "https://acme.nationbuilder.com/api/v2/signups/42");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { id: "42", deleted: true });
});
