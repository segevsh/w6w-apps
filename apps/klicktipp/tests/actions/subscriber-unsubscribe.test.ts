import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/subscriber-unsubscribe.ts";

Deno.test("subscriber-unsubscribe: POSTs the email", async () => {
  const { ctx, calls } = mockCtx([{ body: [true] }]);
  const out = await action.execute({ email: "a@example.com" }, ctx);
  assertEquals(calls[0].url, "https://api.klicktipp.com/subscriber/unsubscribe");
  assertEquals(JSON.parse(calls[0].body!), { email: "a@example.com" });
  assertEquals(out, { success: true });
});

Deno.test("subscriber-unsubscribe: error 7 (email not found) is reported", async () => {
  const { ctx } = mockCtx([{ status: 406, body: { error: 7 } }]);
  await assertRejects(
    async () => await action.execute({ email: "x@example.com" }, ctx),
    Error,
    "not found",
  );
});
