import { assertEquals } from "@std/assert";
import listListFields from "../../actions/list-list-fields.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("list-list-fields: searches /meta/lists with no params", async () => {
  assertEquals(listListFields.type, "search");
  assertEquals(listListFields.params, []);

  const { ctx, calls } = mockCtx([{ body: [] }]);
  await listListFields.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/meta/lists");
  assertEquals(url.search, "");
});

Deno.test("list-list-fields: does not expose `format`, which only duplicates Accept", async () => {
  // `format=json` is documented as "an alternative to using the Accept header",
  // and the client already sends `Accept: application/json`. Two switches for
  // one outcome, where turning the visible one off changes nothing.
  assertEquals((listListFields.params ?? []).length, 0);
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await listListFields.execute({}, ctx);
  assertEquals(new URL(calls[0].url).searchParams.has("format"), false);
  assertEquals(calls[0].headers["accept"], "application/json");
});
