import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/document-get.ts";

const conn = { display: { baseUrl: "https://search.example.com", indexUid: "movies" } };

Deno.test("document-get: reads one document by its primary key value", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 42, title: "Dune" } }], conn);
  const result = await action.execute!({ documentId: "42" }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://search.example.com/indexes/movies/documents/42");
  assertEquals(result.title, "Dune");
});

Deno.test("document-get: an awkward id is encoded, not concatenated", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], conn);
  await action.execute!({ documentId: "a/b c" }, ctx);
  assertEquals(calls[0].url, "https://search.example.com/indexes/movies/documents/a%2Fb%20c");
});

Deno.test("document-get: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`documentId`");
  assertEquals(calls.length, 0);
});
