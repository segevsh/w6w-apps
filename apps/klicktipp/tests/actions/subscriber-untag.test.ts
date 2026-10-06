import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/subscriber-untag.ts";

Deno.test("subscriber-untag: POSTs email and a single integer tagid", async () => {
  const { ctx, calls } = mockCtx([{ body: [true] }]);
  const out = await action.execute({ email: "a@example.com", tagId: 19 }, ctx);
  assertEquals(calls[0].url, "https://api.klicktipp.com/subscriber/untag");
  assertEquals(JSON.parse(calls[0].body!), { email: "a@example.com", tagid: 19 });
  assertEquals(out, { success: true });
});

Deno.test("subscriber-untag: a failure body is not swallowed", async () => {
  const { ctx } = mockCtx([{ status: 406, body: { error: 403 } }]);
  await assertRejects(
    async () => await action.execute({ email: "a@example.com", tagId: 1 }, ctx),
    Error,
    "tag not found",
  );
});
