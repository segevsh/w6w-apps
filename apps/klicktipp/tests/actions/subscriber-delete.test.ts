import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/subscriber-delete.ts";

Deno.test("subscriber-delete: DELETEs the contact", async () => {
  const { ctx, calls } = mockCtx([{ body: [true] }]);
  const out = await action.execute({ subscriberId: "42" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, "https://api.klicktipp.com/subscriber/42");
  assertEquals(calls[0].body, null);
  assertEquals(out, { success: true });
});

Deno.test("subscriber-delete: a missing contact is a failure", async () => {
  const { ctx } = mockCtx([{ status: 406, body: { error: 401 } }]);
  await assertRejects(
    async () => await action.execute({ subscriberId: "42" }, ctx),
    Error,
    "contact not found",
  );
});
