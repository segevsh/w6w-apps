import { describe, test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { listEnvelope, mockCtx, PID } from "../_helpers.ts";
import newArticleVersion from "../../triggers/new-article-version.ts";
import newDriveFolder from "../../triggers/new-drive-folder.ts";
import newProject from "../../triggers/new-project.ts";
import newReader from "../../triggers/new-reader.ts";
import newTeamAccount from "../../triggers/new-team-account.ts";
import newTeamGroup from "../../triggers/new-team-group.ts";
import newWorkspace from "../../triggers/new-workspace.ts";
import newWorkspaceCategory from "../../triggers/new-workspace-category.ts";

const root = "https://apihub.document360.io";
const rows = (from: number, n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: `r-${from + i}` }));
const pageOf = (items: unknown[], page: number, more: boolean) =>
  listEnvelope(items, { page, page_size: 100, has_more: more });

describe("paging", () => {
  const input = { params: {}, subscriptionId: "s" };
  const url = (page: number) => `${root}/v3/projects/${PID}/readers?page=${page}&page_size=100`;

  test("new-reader reads every page, sees a record that only exists on page 2, and stays quiet", async () => {
    const p1 = rows(0, 100);
    const seeded = await newReader.poll!(
      { ...input, state: {} },
      mockCtx([{ body: pageOf(p1, 1, true) }, { body: pageOf([{ id: "r-100" }], 2, false) }]).ctx,
    );
    assertEquals(seeded.events, []);

    const quiet = mockCtx([
      { body: pageOf(p1, 1, true) },
      { body: pageOf([{ id: "r-100" }], 2, false) },
    ]);
    const same = await newReader.poll!({ ...input, state: seeded.nextState }, quiet.ctx);
    assertEquals(same.events, []);
    assertEquals(quiet.calls.map((c) => c.url), [url(1), url(2)]);

    const grown = mockCtx([
      { body: pageOf(p1, 1, true) },
      { body: pageOf([{ id: "r-100" }, { id: "r-101" }], 2, false) },
    ]);
    const out = await newReader.poll!({ ...input, state: seeded.nextState }, grown.ctx);
    assertEquals(out.events, [{ id: "r-101" }]);
  });

  test("a collection past 10 pages (1000 records) throws rather than truncating", async () => {
    const full = Array.from({ length: 10 }, (_, i) => ({
      body: pageOf(rows(i * 100, 100), i + 1, true),
    }));
    const m = mockCtx(full);
    let failure = "";
    try {
      await newReader.poll!({ ...input, state: {} }, m.ctx);
    } catch (err) {
      failure = (err as Error).message;
    }
    assertEquals(failure, "new-reader has more than 1000 records");
    assertEquals(m.calls.length, 10);
  });

  test("exactly 10 full pages that end with has_more=false is accepted", async () => {
    const pages = Array.from({ length: 10 }, (_, i) => ({
      body: pageOf(rows(i * 100, 100), i + 1, i < 9),
    }));
    const out = await newReader.poll!({ ...input, state: {} }, mockCtx(pages).ctx);
    assertEquals(Object.keys((out.nextState as { hashes: object }).hashes).length, 1000);
  });
});

describe("edits", () => {
  test("new-reader does not fire for a record edited in place", async () => {
    const input = { params: {}, subscriptionId: "s" };
    const seeded = await newReader.poll!(
      { ...input, state: {} },
      mockCtx([{ body: listEnvelope([{ id: "r-1", email: "a@example.test" }]) }]).ctx,
    );
    const out = await newReader.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([{ body: listEnvelope([{ id: "r-1", email: "b@example.test" }]) }]).ctx,
    );
    assertEquals(out.events, []);
  });
});

describe("trees: nested nodes are rows", () => {
  const input = { params: {}, subscriptionId: "s" };

  test("new-drive-folder fires for a new sub-folder, without the nested children", async () => {
    const tree = (extra: unknown[]) => [{
      id: "f1",
      title: "Root",
      sub_folders: [{ id: "f2", title: "Child", sub_folders: extra }],
    }];
    const seed = mockCtx([{ body: listEnvelope(tree([])) }]);
    const seeded = await newDriveFolder.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals(seed.calls[0].url, `${root}/v3/projects/${PID}/drive/folders`);
    const out = await newDriveFolder.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([{ body: listEnvelope(tree([{ id: "f3", title: "Grandchild", sub_folders: [] }])) }])
        .ctx,
    );
    assertEquals(out.events, [{ id: "f3", title: "Grandchild" }]);
  });

  test("new-workspace-category fires for a new sub-category at any depth", async () => {
    const params = { workspaceId: "workspace-1" };
    const tree = (extra: unknown[]) => [{
      id: "c1",
      name: "Root",
      child_categories: [{ id: "c2", name: "Child", child_categories: extra }],
    }];
    const seeded = await newWorkspaceCategory.poll!(
      { params, subscriptionId: "s", state: {} },
      mockCtx([{ body: listEnvelope(tree([])) }]).ctx,
    );
    const out = await newWorkspaceCategory.poll!(
      { params, subscriptionId: "s", state: seeded.nextState },
      mockCtx([{
        body: listEnvelope(tree([{ id: "c3", name: "Grandchild", child_categories: [] }])),
      }])
        .ctx,
    );
    assertEquals(out.events, [{ id: "c3", name: "Grandchild" }]);
  });
});

describe("params", () => {
  test("no snapshot trigger offers the paging params it overrides", () => {
    const dead = ["page", "pageSize", "cursor", "includeTotalCount"];
    for (
      const t of [
        newArticleVersion,
        newDriveFolder,
        newProject,
        newReader,
        newTeamAccount,
        newTeamGroup,
        newWorkspace,
        newWorkspaceCategory,
      ]
    ) {
      assertEquals((t.params ?? []).filter((p) => dead.includes(p.key)).map((p) => p.key), []);
    }
  });

  test("the trigger keeps its required parent and filter params", () => {
    assertEquals(
      (newWorkspaceCategory.params ?? []).map((p) => p.key),
      ["projectId", "workspaceId", "langCode", "includeArchived"],
    );
    assertEquals((newReader.params ?? []).map((p) => p.key), ["projectId", "searchEmail"]);
  });
});
