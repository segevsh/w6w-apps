import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/entry-get.ts";

const display = { endpoint: "https://example.com" };

Deno.test("entry-get: GETs /api/<collection>/<id>", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: 1, title: "hi" } } }], { display });
  const result = await action.execute({ collection: "articles", id: "1" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/api/articles/1");
  assertEquals(result, { data: { id: 1, title: "hi" } });
});

Deno.test("entry-get: works with a v5 documentId as the id", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }], { display });
  await action.execute({ collection: "articles", id: "abcxyz123doc" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/articles/abcxyz123doc");
});

Deno.test("entry-get: forwards fields/populate/status", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }], { display });
  await action.execute(
    { collection: "articles", id: "1", fields: "title,slug", populate: "*", status: "draft" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("fields[0]"), "title");
  assertEquals(url.searchParams.get("fields[1]"), "slug");
  assertEquals(url.searchParams.get("populate"), "*");
  assertEquals(url.searchParams.get("status"), "draft");
});
