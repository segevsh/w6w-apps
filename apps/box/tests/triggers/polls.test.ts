import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { mockCtx } from "../_helpers.ts";
import newFolderItem from "../../triggers/new-folder-item.ts";
import newOrUpdatedSearchResult from "../../triggers/new-or-updated-search-result.ts";
import search from "../../actions/search.ts";

const seededOf = (r: { nextState: unknown }) => (r.nextState as { seeded?: boolean }).seeded;

describe("new-folder-item", () => {
  const params = { folderId: "42" };
  const entry = (id: string, type = "file") => ({ type, id, etag: "1", name: `${id}.pdf` });
  const page = (entries: unknown[]) => ({ body: { entries, limit: 1000, offset: 0 } });
  const URL0 = "https://api.box.com/2.0/folders/42/items?limit=1000&offset=0&usemarker=false";

  test("seeds without emitting, then emits only the new item; the retry is identical", async () => {
    const seed = mockCtx([page([entry("1"), entry("2", "folder")])]);
    const seeded = await newFolderItem.poll!({ params, state: {}, subscriptionId: "s" }, seed.ctx);
    assert.deepEqual(seeded.events, []);
    assert.equal(seededOf(seeded), true);

    const items = [entry("1"), entry("2", "folder"), entry("3")];
    const a = await newFolderItem.poll!(
      { params, state: seeded.nextState, subscriptionId: "s" },
      mockCtx([page(items)]).ctx,
    );
    const b = await newFolderItem.poll!(
      { params, state: seeded.nextState, subscriptionId: "s" },
      mockCtx([page(items)]).ctx,
    );
    assert.deepEqual(a.events, [entry("3")]);
    assert.deepEqual(b, a);
  });

  test("asks Box for the folder's items by literal request", async () => {
    const m = mockCtx([page([])]);
    await newFolderItem.poll!({ params, state: {}, subscriptionId: "s" }, m.ctx);
    assert.deepEqual(m.calls.map((c) => [c.method, c.url]), [["GET", URL0]]);
  });

  test("a file and a folder sharing an id are different items", async () => {
    const seeded = await newFolderItem.poll!(
      { params, state: {}, subscriptionId: "s" },
      mockCtx([page([entry("7")])]).ctx,
    );
    const r = await newFolderItem.poll!(
      { params, state: seeded.nextState, subscriptionId: "s" },
      mockCtx([page([entry("7"), entry("7", "folder")])]).ctx,
    );
    assert.deepEqual(r.events, [entry("7", "folder")]);
  });

  test("a full page is followed by the next offset; a folder over 5000 items fails clearly", async () => {
    const full = (from: number) =>
      page(Array.from({ length: 1000 }, (_, i) => entry(String(from + i))));
    const two = mockCtx([full(0), page([entry("x")])]);
    await newFolderItem.poll!({ params, state: {}, subscriptionId: "s" }, two.ctx);
    assert.deepEqual(two.calls.map((c) => c.url), [
      URL0,
      "https://api.box.com/2.0/folders/42/items?limit=1000&offset=1000&usemarker=false",
    ]);
    const big = mockCtx([0, 1000, 2000, 3000, 4000].map(full));
    await assert.rejects(
      newFolderItem.poll!({ params, state: {}, subscriptionId: "s" }, big.ctx),
      /more than 5000 items/,
    );
  });

  test("an empty folder id is refused before any request", async () => {
    const m = mockCtx();
    await assert.rejects(
      newFolderItem.poll!({ params: { folderId: " " }, state: {}, subscriptionId: "s" }, m.ctx),
      /id of the Box folder/,
    );
    assert.equal(m.calls.length, 0);
  });
});

describe("new-or-updated-search-result", () => {
  const params = { query: "invoice" };
  const hit = (id: string, modified: string, type = "file") => ({
    type,
    id,
    name: `${id}.pdf`,
    modified_at: modified,
  });
  const page = (entries: unknown[]) => ({ body: { entries, total_count: entries.length } });
  const URL0 =
    "https://api.box.com/2.0/search?query=invoice&scope=user_content&limit=100&offset=0&sort=modified_at&direction=DESC";

  test("seeds, emits the new match, treats an edited match as new, retries identically", async () => {
    const seeded = await newOrUpdatedSearchResult.poll!(
      { params, state: {}, subscriptionId: "s" },
      mockCtx([page([hit("1", "2026-11-01T00:00:00-08:00")])]).ctx,
    );
    assert.deepEqual(seeded.events, []);
    assert.equal(seededOf(seeded), true);

    const items = [
      hit("2", "2026-11-10T00:00:00-08:00"),
      hit("1", "2026-11-09T00:00:00-08:00"), // id 1 edited since the seed
    ];
    const a = await newOrUpdatedSearchResult.poll!(
      { params, state: seeded.nextState, subscriptionId: "s" },
      mockCtx([page(items)]).ctx,
    );
    const b = await newOrUpdatedSearchResult.poll!(
      { params, state: seeded.nextState, subscriptionId: "s" },
      mockCtx([page(items)]).ctx,
    );
    assert.deepEqual(a.events, [items[1], items[0]]); // oldest first
    assert.deepEqual(b, a);
  });

  test("sends the sorted search request by literal URL, with the optional filters", async () => {
    const m = mockCtx([page([])]);
    await newOrUpdatedSearchResult.poll!({ params, state: {}, subscriptionId: "s" }, m.ctx);
    assert.deepEqual(m.calls.map((c) => [c.method, c.url]), [["GET", URL0]]);
    const f = mockCtx([page([])]);
    await newOrUpdatedSearchResult.poll!(
      {
        params: { query: "q 1", type: "file", scope: "enterprise_content", ancestorFolderIds: "5" },
        state: {},
        subscriptionId: "s",
      },
      f.ctx,
    );
    assert.equal(
      f.calls[0].url,
      "https://api.box.com/2.0/search?query=q+1&type=file&scope=enterprise_content&ancestor_folder_ids=5&limit=100&offset=0&sort=modified_at&direction=DESC",
    );
  });

  test("the search action without sort/direction sends the request it always did", async () => {
    const m = mockCtx([page([])]);
    await search.execute({ query: "invoice" }, m.ctx);
    assert.equal(
      m.calls[0].url,
      "https://api.box.com/2.0/search?query=invoice&scope=user_content&limit=30&offset=0",
    );
  });
});
