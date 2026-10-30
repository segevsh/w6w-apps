import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-forms.ts";

test("list-forms: queries Drive for the Google Forms mime type", async () => {
  const { ctx, calls } = mockCtx([{ body: { files: [] } }]);
  const result = await action.execute({}, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://www.googleapis.com");
  assertEquals(url.pathname, "/drive/v3/files");
  assertEquals(
    url.searchParams.get("q"),
    "mimeType='application/vnd.google-apps.form' and trashed=false",
  );
  assertEquals(url.searchParams.get("pageSize"), "100");
  assertEquals(
    url.searchParams.get("fields"),
    "nextPageToken,incompleteSearch,files(id,name,createdTime,modifiedTime,webViewLink)",
  );
  assertEquals(result, { files: [] });
});

test("list-forms: includeTrashed drops the trashed=false clause", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ includeTrashed: true }, ctx);
  assertEquals(
    new URL(calls[0].url).searchParams.get("q"),
    "mimeType='application/vnd.google-apps.form'",
  );
});

test("list-forms: escapes an apostrophe in the name filter", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ nameContains: "Bob's form" }, ctx);
  assertEquals(
    new URL(calls[0].url).searchParams.get("q"),
    "mimeType='application/vnd.google-apps.form' and trashed=false and name contains 'Bob\\'s form'",
  );
});

test("list-forms: forwards orderBy, pageSize and pageToken", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ orderBy: "modifiedTime desc", pageSize: 5, pageToken: "tok" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("orderBy"), "modifiedTime desc");
  assertEquals(url.searchParams.get("pageSize"), "5");
  assertEquals(url.searchParams.get("pageToken"), "tok");
});

test("list-forms: is a search action (Drive, not Forms — Forms has no list method)", () => {
  assertEquals(action.type, "search");
});
