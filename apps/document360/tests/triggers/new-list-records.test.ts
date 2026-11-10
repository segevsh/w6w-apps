import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { listEnvelope, mockCtx, PID } from "../_helpers.ts";
import newArticleVersion from "../../triggers/new-article-version.ts";
import newDriveFolder from "../../triggers/new-drive-folder.ts";
import newProject from "../../triggers/new-project.ts";
import newReader from "../../triggers/new-reader.ts";
import newTeamGroup from "../../triggers/new-team-group.ts";
import newTeamAccount from "../../triggers/new-team-account.ts";
import newWorkspaceCategory from "../../triggers/new-workspace-category.ts";
import newWorkspace from "../../triggers/new-workspace.ts";

const root = "https://apihub.document360.io";
const cases = [
  {
    key: "new-article-version",
    trigger: newArticleVersion,
    params: { articleId: "article-1" },
    url: `${root}/v3/projects/${PID}/articles/article-1/versions`,
  },
  {
    key: "new-drive-folder",
    trigger: newDriveFolder,
    params: {},
    url: `${root}/v3/projects/${PID}/drive/folders`,
  },
  {
    key: "new-project",
    trigger: newProject,
    params: {},
    url: `${root}/v3/projects?page=1&page_size=100`,
  },
  {
    key: "new-reader",
    trigger: newReader,
    params: {},
    url: `${root}/v3/projects/${PID}/readers?page=1&page_size=100`,
  },
  {
    key: "new-team-group",
    trigger: newTeamGroup,
    params: {},
    url: `${root}/v3/projects/${PID}/users/groups?page=1&page_size=100`,
  },
  {
    key: "new-team-account",
    trigger: newTeamAccount,
    params: {},
    url: `${root}/v3/projects/${PID}/users?page=1&page_size=100`,
  },
  {
    key: "new-workspace-category",
    trigger: newWorkspaceCategory,
    params: { workspaceId: "workspace-1" },
    url: `${root}/v3/projects/${PID}/workspaces/workspace-1/categories?page=1&page_size=100`,
  },
  {
    key: "new-workspace",
    trigger: newWorkspace,
    params: {},
    url: `${root}/v3/projects/${PID}/workspaces?page=1&page_size=100`,
  },
];

for (const c of cases) {
  test(`${c.key}: seeds, emits, retries, and uses the literal list request`, async () => {
    const input = { params: c.params, subscriptionId: "sub-1" };
    const seed = mockCtx([{ body: listEnvelope([{ id: "one" }]) }]);
    const seeded = await c.trigger.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(seed.calls[0].method, "GET");
    assertEquals(seed.calls[0].url, c.url);

    const page = [{ id: "two" }, { id: "one" }];
    const first = await c.trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([{ body: listEnvelope(page) }]).ctx,
    );
    const retry = await c.trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([{ body: listEnvelope(page) }]).ctx,
    );
    assertEquals(first.events, [{ id: "two" }]);
    assertEquals(retry, first);
  });
}
