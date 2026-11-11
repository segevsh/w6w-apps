import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newUser from "../../triggers/new-user.ts";
import newOrUpdatedUser from "../../triggers/new-or-updated-user.ts";
import newTag from "../../triggers/new-tag.ts";
import newOrUpdatedTag from "../../triggers/new-or-updated-tag.ts";
import newGroup from "../../triggers/new-group.ts";
import newOrUpdatedGroup from "../../triggers/new-or-updated-group.ts";
import newProjectComment from "../../triggers/new-project-comment.ts";
import newProjectDocument from "../../triggers/new-project-document.ts";
import newProjectLabel from "../../triggers/new-project-label.ts";
import newProjectAssignedUser from "../../triggers/new-project-assigned-user.ts";
import newProjectCollaborator from "../../triggers/new-project-collaborator.ts";
import newProjectInvitation from "../../triggers/new-project-invitation.ts";
import newPhotoComment from "../../triggers/new-photo-comment.ts";
import newPhotoTag from "../../triggers/new-photo-tag.ts";

// Snapshot triggers (brief 9.1c): each check reads every page of the wrapped list and diffs by id.
const ROOT = "https://api.companycam.com/v2";
const row = (id: string, v = 1) => ({ id, name: `n${id}`, v });
const P = { projectId: "proj-9" };
const PH = { photoId: "photo-9" };

const cases = [
  [newUser, {}, "/users"],
  [newOrUpdatedUser, {}, "/users"],
  [newTag, {}, "/tags"],
  [newOrUpdatedTag, {}, "/tags"],
  [newGroup, {}, "/groups"],
  [newOrUpdatedGroup, {}, "/groups"],
  [newProjectComment, P, "/projects/proj-9/comments"],
  [newProjectDocument, P, "/projects/proj-9/documents"],
  [newProjectLabel, P, "/projects/proj-9/labels"],
  [newProjectAssignedUser, P, "/projects/proj-9/assigned_users"],
  [newProjectCollaborator, P, "/projects/proj-9/collaborators"],
  [newProjectInvitation, P, "/projects/proj-9/invitations"],
  [newPhotoComment, PH, "/photos/photo-9/comments"],
  [newPhotoTag, PH, "/photos/photo-9/tags"],
] as const;

for (const [trigger, params, path] of cases) {
  const name = trigger.key;
  const input = { params: params as Record<string, unknown>, subscriptionId: "sub-1" };
  const fullPage = (n: number) => ({
    body: Array.from({ length: 100 }, (_, i) => row(`p${n}-${i}`)),
  });

  test(`${name}: seed emits nothing and sends the documented request`, async () => {
    const c = mockCtx([{ body: [row("1")] }]);
    const r = await trigger.poll!({ ...input, state: {} }, c.ctx);
    assertEquals(r.events, []);
    assertEquals((r.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(c.calls.length, 1);
    assertEquals(c.calls[0].method, "GET");
    assertEquals(c.calls[0].url, `${ROOT}${path}?page=1&per_page=100`);
  });

  test(`${name}: reads every full page, emits only the new row, retry is idempotent`, async () => {
    const seeded = await trigger.poll!(
      { ...input, state: {} },
      mockCtx([fullPage(1), { body: [row("tail")] }]).ctx,
    );
    const run = () => {
      const c = mockCtx([fullPage(1), { body: [row("tail"), row("new")] }]);
      return trigger.poll!({ ...input, state: seeded.nextState }, c.ctx).then((r) => ({ r, c }));
    };
    const first = await run();
    assertEquals(first.r.events, [row("new")]);
    assertEquals(first.c.calls.length, 2);
    assertEquals(first.c.calls[1].url, `${ROOT}${path}?page=2&per_page=100`);
    assertEquals((await run()).r, first.r);
  });

  test(`${name}: refuses a collection past the page cap instead of looping`, async () => {
    const forever = Array.from({ length: 50 }, (_, i) => fullPage(i));
    await assertRejects(
      () => trigger.poll!({ ...input, state: {} }, mockCtx(forever).ctx),
      Error,
      "more than 50 pages",
    );
  });
}

for (
  const [plain, updated] of [
    [newUser, newOrUpdatedUser],
    [newTag, newOrUpdatedTag],
    [newGroup, newOrUpdatedGroup],
  ] as const
) {
  test(`${plain.key} ignores an edited row; ${updated.key} emits it`, async () => {
    const input = { params: {}, subscriptionId: "sub-1" };
    for (const [trigger, expected] of [[plain, []], [updated, [row("1", 2)]]] as const) {
      const seeded = await trigger.poll!(
        { ...input, state: {} },
        mockCtx([{ body: [row("1", 1)] }]).ctx,
      );
      const r = await trigger.poll!(
        { ...input, state: seeded.nextState },
        mockCtx([{ body: [row("1", 2)] }]).ctx,
      );
      assertEquals(r.events, expected);
    }
  });
}
