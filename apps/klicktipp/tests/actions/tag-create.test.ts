import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/tag-create.ts";

Deno.test("tag-create: POSTs name and text, returns the new id", async () => {
  const { ctx, calls } = mockCtx([{ body: [49] }]);
  const out = await action.execute({ name: "mynewtag", text: "hello" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.klicktipp.com/tag");
  assertEquals(JSON.parse(calls[0].body!), { name: "mynewtag", text: "hello" });
  assertEquals(out, { tagId: 49 });
});

Deno.test("tag-create: omits an empty description", async () => {
  const { ctx, calls } = mockCtx([{ body: [50] }]);
  await action.execute({ name: "t", text: "" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { name: "t" });
});

Deno.test("tag-create: a body without an id is a failure", async () => {
  const { ctx } = mockCtx([{ body: [] }]);
  await assertRejects(
    async () => await action.execute({ name: "t" }, ctx),
    Error,
    "did not return an id",
  );
});
