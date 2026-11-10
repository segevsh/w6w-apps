import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";
import newEpic from "../../triggers/new-epic.ts";
import newIteration from "../../triggers/new-iteration.ts";
import newLabel from "../../triggers/new-label.ts";
import newMember from "../../triggers/new-member.ts";
import newProject from "../../triggers/new-project.ts";
import newEpicComment from "../../triggers/new-epic-comment.ts";
import newStoryComment from "../../triggers/new-story-comment.ts";
import newEpicStory from "../../triggers/new-epic-story.ts";
import newIterationStory from "../../triggers/new-iteration-story.ts";
import newLabelStory from "../../triggers/new-label-story.ts";

const rec = (id: number) => ({ id, name: `n-${id}` });
const input = (params: Record<string, unknown>, state: unknown) => ({
  params,
  subscriptionId: "sub-1",
  state,
});
const req = (c: { method: string; url: string }) => ({
  method: c.method,
  path: pathOf(c.url),
  query: queryOf(c.url),
});

const CASES = [
  ["new-epic", newEpic, {}, "/api/v3/epics/paginated", { page: "1", page_size: "100" }, true],
  ["new-iteration", newIteration, {}, "/api/v3/iterations", {}, false],
  ["new-label", newLabel, {}, "/api/v3/labels", {}, false],
  ["new-member", newMember, {}, "/api/v3/members", {}, false],
  ["new-project", newProject, {}, "/api/v3/projects", {}, false],
  ["new-epic-comment", newEpicComment, { epicId: 31 }, "/api/v3/epics/31/comments", {}, false],
  [
    "new-story-comment",
    newStoryComment,
    { storyId: 1234 },
    "/api/v3/stories/1234/comments",
    {},
    false,
  ],
  ["new-epic-story", newEpicStory, { epicId: 31 }, "/api/v3/epics/31/stories", {}, false],
  [
    "new-iteration-story",
    newIterationStory,
    { iterationId: 7 },
    "/api/v3/iterations/7/stories",
    {},
    false,
  ],
  ["new-label-story", newLabelStory, { labelId: 12 }, "/api/v3/labels/12/stories", {}, false],
] as const;

for (const [name, trigger, params, path, query, paged] of CASES) {
  // `epic-list` answers { data, next, total }; every other list is a bare array.
  const reply = (ids: number[], next: number | null = null) => ({
    body: paged ? { data: ids.map(rec), next, total: ids.length } : ids.map(rec),
  });
  describe(name, () => {
    test("seeds, emits only the new record, retries identically", async () => {
      const seeded = await trigger.poll!(input(params, {}), mockCtx([reply([1, 2])]).ctx);
      assert.deepEqual(seeded.events, []);
      assert.equal((seeded.nextState as { seeded?: boolean }).seeded, true);
      const page = () => mockCtx([reply([1, 2, 3])]);
      const out = await trigger.poll!(input(params, seeded.nextState), page().ctx);
      const retry = await trigger.poll!(input(params, seeded.nextState), page().ctx);
      assert.deepEqual(out.events, [rec(3)]);
      assert.deepEqual(retry, out);
    });

    test("sends the literal list request", async () => {
      const m = mockCtx([reply([1])]);
      await trigger.poll!(input(params, {}), m.ctx);
      assert.equal(m.calls.length, 1);
      assert.deepEqual(req(m.calls[0]), { method: "GET", path, query });
    });
  });
}

test("new-epic follows next across pages", async () => {
  const body = (ids: number[], next: number | null) => ({
    body: { data: ids.map(rec), next, total: 2 },
  });
  const m = mockCtx([body([1], 2), body([2], null)]);
  await newEpic.poll!(input({}, {}), m.ctx);
  assert.deepEqual(m.calls.map(req), [
    {
      method: "GET",
      path: "/api/v3/epics/paginated",
      query: { page: "1", page_size: "100" },
    },
    {
      method: "GET",
      path: "/api/v3/epics/paginated",
      query: { page: "2", page_size: "100" },
    },
  ]);
});

test("new-epic refuses a workspace of more than 50 pages", async () => {
  const pages = Array.from({ length: 51 }, (_, i) => ({
    body: { data: [rec(i)], next: i + 2, total: 51 },
  }));
  await assert.rejects(() => newEpic.poll!(input({}, {}), mockCtx(pages).ctx), /5000/);
});
