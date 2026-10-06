import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/ai-fields.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("ai-fields: sends fields as deepObject query and returns the result object", async () => {
  const body = { result: { price: "$9", title: null } };
  const { ctx, calls } = mockCtx([{ body }]);
  const out = await action.execute({
    url: "https://e.test",
    fields: { price: "Current price", title: "Title" },
  }, ctx);
  assertEquals(out, body);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("fields[price]"), "Current price");
  assertEquals(q.get("fields[title]"), "Title");
  assertEquals(new URL(calls[0].url).pathname, "/ai/fields");
});

Deno.test("ai-fields: accepts a JSON string; rejects a non-object or empty fields before any call", async () => {
  const { ctx, calls } = mockCtx([{ body: { result: {} } }]);
  await action.execute({ url: "https://e.test", fields: '{"a":"b"}' }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("fields[a]"), "b");
  const none = mockCtx();
  for (const fields of ["[1]", "nope", "{}", ""]) {
    await assertRejects(
      async () => await action.execute({ url: "https://e.test", fields }, none.ctx),
      Error,
    );
  }
  assertEquals(none.calls.length, 0);
});

Deno.test("ai-fields: auto proxy together with a custom proxy is refused locally", async () => {
  const none = mockCtx();
  await assertRejects(
    async () =>
      await action.execute({
        url: "https://e.test",
        fields: { a: "b" },
        proxy: "auto",
        customProxy: "http://u:p@h:1",
      }, none.ctx),
    Error,
    "cannot be combined",
  );
  assertEquals(none.calls.length, 0);
});
