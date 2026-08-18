import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/document-list.ts";

const conn = { display: { baseUrl: "https://search.example.com", indexUid: "movies" } };

Deno.test("document-list: reads documents in index order, offset-paged", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { results: [{ id: 1 }], total: 1 } }], conn);
  assertEquals(await action.execute!({}, ctx), [{ id: 1 }]);
  assertEquals(new URL(calls[0].url).pathname, "/indexes/movies/documents");
  assertEquals(new URL(calls[0].url).searchParams.get("offset"), "0");
});

Deno.test("document-list: fields and filter reach the wire", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { results: [] } }], conn);
  await action.execute!({ fields: "title, year", filter: "year > 2000" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("fields"), "title,year");
  assertEquals(q.get("filter"), "year > 2000");
});

Deno.test("document-list: with no index anywhere it says so before calling", async () => {
  const { ctx, calls } = mockCtx([], { display: { baseUrl: "https://x.com" } });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "no index");
  assertEquals(calls.length, 0);
});
