import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-section-groups.ts";

test("list-section-groups: no container means the flat listing", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/onenote/sectionGroups");
});

test("list-section-groups: Notebook ID scopes to that notebook", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ notebookId: "n1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/onenote/notebooks/n1/sectionGroups");
});

test("list-section-groups: OneNote-only filters SharePoint's non-OneNote folders", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ location: "site", locationId: "s1", onenoteOnly: true }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1.0/sites/s1/onenote/sectionGroups");
  assertEquals(url.searchParams.get("$filter"), "parentNotebook ne null");
});

test("list-section-groups: OneNote-only off sends no $filter", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).searchParams.has("$filter"), false);
});
