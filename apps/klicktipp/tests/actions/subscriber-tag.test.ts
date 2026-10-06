import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/subscriber-tag.ts";

Deno.test("subscriber-tag: sends tag ids as integers", async () => {
  const { ctx, calls } = mockCtx([{ body: [true] }]);
  const out = await action.execute({ email: "a@example.com", tagIds: "19, 20" }, ctx);
  assertEquals(calls[0].url, "https://api.klicktipp.com/subscriber/tag");
  assertEquals(JSON.parse(calls[0].body!), { email: "a@example.com", tagids: [19, 20] });
  assertEquals(out, { success: true });
});

Deno.test("subscriber-tag: rejects a non-numeric tag id before calling", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute({ email: "a@example.com", tagIds: "x" }, ctx),
    Error,
    "numeric",
  );
  assertEquals(calls.length, 0);
});

Deno.test("subscriber-tag: error 31 says smart tags are system-assigned", async () => {
  const { ctx } = mockCtx([{ status: 406, body: { error: 31 } }]);
  await assertRejects(
    async () => await action.execute({ email: "a@example.com", tagIds: "5" }, ctx),
    Error,
    "smart tags",
  );
});
