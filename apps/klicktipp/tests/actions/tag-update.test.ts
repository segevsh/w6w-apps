import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/tag-update.ts";

Deno.test("tag-update: PUTs only the given keys", async () => {
  const { ctx, calls } = mockCtx([{ body: [true] }]);
  const out = await action.execute({ tagId: 21, name: "renamed" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url, "https://api.klicktipp.com/tag/21");
  assertEquals(JSON.parse(calls[0].body!), { name: "renamed" });
  assertEquals(out, { success: true });
});

Deno.test("tag-update: refuses an empty update", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute({ tagId: 21 }, ctx), Error, "new name");
  assertEquals(calls.length, 0);
});
