import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/entry-list.ts";

const display = { endpoint: "https://example.com" };

Deno.test("entry-list: GETs /api/<collection> with default pagination", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [], meta: {} } }], { display });
  const result = await action.execute({ collection: "articles" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.pathname, "/api/articles");
  assertEquals(result, { data: [], meta: {} });
});

Deno.test("entry-list: encodes filters as bracket-notation query params", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }], { display });
  await action.execute(
    { collection: "articles", filters: { title: { $eq: "hello" } } },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("filters[title][$eq]"), "hello");
});

Deno.test("entry-list: splits comma-separated sort into sort[i] clauses", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }], { display });
  await action.execute({ collection: "articles", sort: "title:asc, id:desc" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("sort[0]"), "title:asc");
  assertEquals(url.searchParams.get("sort[1]"), "id:desc");
});

Deno.test("entry-list: splits comma-separated fields into fields[i]", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }], { display });
  await action.execute({ collection: "articles", fields: "title, slug" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("fields[0]"), "title");
  assertEquals(url.searchParams.get("fields[1]"), "slug");
});

Deno.test("entry-list: forwards populate and status", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }], { display });
  await action.execute(
    { collection: "articles", populate: "*", status: "draft" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("populate"), "*");
  assertEquals(url.searchParams.get("status"), "draft");
});

Deno.test("entry-list: forwards page/pageSize as pagination[...]", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }], { display });
  await action.execute({ collection: "articles", page: 2, pageSize: 10 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("pagination[page]"), "2");
  assertEquals(url.searchParams.get("pagination[pageSize]"), "10");
});
