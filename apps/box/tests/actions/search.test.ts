import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/search.ts";

Deno.test("search: GETs /search with the query and defaults", async () => {
  const resp = { entries: [], total_count: 0 };
  const { ctx, calls } = mockCtx([{ body: resp }]);
  const result = await action.execute!({ query: "invoice" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/2.0/search");
  assertEquals(calls[0].method, "GET");
  assertEquals(url.searchParams.get("query"), "invoice");
  assertEquals(url.searchParams.get("scope"), "user_content");
  assertEquals(url.searchParams.get("limit"), "30");
  assertEquals(url.searchParams.get("offset"), "0");
  assertEquals(url.searchParams.has("type"), false);
  assertEquals(result, resp);
});

Deno.test("search: forwards type, file extensions and ancestor folder ids", async () => {
  const { ctx, calls } = mockCtx([{ body: { entries: [] } }]);
  await action.execute!(
    {
      query: "report",
      type: "file",
      fileExtensions: "pdf,png",
      ancestorFolderIds: "1,2",
      limit: 50,
      offset: 10,
    },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("type"), "file");
  assertEquals(url.searchParams.get("file_extensions"), "pdf,png");
  assertEquals(url.searchParams.get("ancestor_folder_ids"), "1,2");
  assertEquals(url.searchParams.get("limit"), "50");
  assertEquals(url.searchParams.get("offset"), "10");
});
