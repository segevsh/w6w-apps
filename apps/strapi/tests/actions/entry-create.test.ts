import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/entry-create.ts";

const display = { endpoint: "https://example.com" };

Deno.test("entry-create: POSTs /api/<collection> with a { data } envelope", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: { id: 1, title: "hi" } } }], {
    display,
  });
  const result = await action.execute(
    { collection: "articles", data: { title: "hi" } },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/articles");
  assertEquals(JSON.parse(calls[0].body!), { data: { title: "hi" } });
  assertEquals(result, { data: { id: 1, title: "hi" } });
});

Deno.test("entry-create: is declared not idempotent", () => {
  assertEquals(action.idempotent, false);
  assertEquals(action.type, "perform");
});
