import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/entry-update.ts";

const display = { endpoint: "https://example.com" };

Deno.test("entry-update: PUTs /api/<collection>/<id> with a { data } envelope", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: 1, title: "updated" } } }], { display });
  const result = await action.execute(
    { collection: "articles", id: "1", data: { title: "updated" } },
    ctx,
  );
  assertEquals(calls[0].method, "PUT");
  assertEquals(new URL(calls[0].url).pathname, "/api/articles/1");
  assertEquals(JSON.parse(calls[0].body!), { data: { title: "updated" } });
  assertEquals(result, { data: { id: 1, title: "updated" } });
});

Deno.test("entry-update: is declared idempotent", () => {
  assertEquals(action.idempotent, true);
});
