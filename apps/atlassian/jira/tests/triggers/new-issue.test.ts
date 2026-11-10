import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockJiraCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-issue.ts";

const params = { jql: "project = ENG" };
const issue1 = { id: "10001", key: "ENG-1", fields: { summary: "First" } };
const issue2 = { id: "10002", key: "ENG-2", fields: { summary: "Second" } };

test("new-issue: seeds without emitting existing issues", async () => {
  const { ctx } = mockJiraCtx([{ body: { issues: [issue1] } }]);
  const result = await trigger.poll!({ params, state: {} }, ctx);
  assertEquals(result.events, []);
  assertEquals(result.nextState.seeded, true);
});

test("new-issue: emits an issue that arrives after the seed", async () => {
  const { ctx } = mockJiraCtx([{ body: { issues: [issue1] } }, {
    body: { issues: [issue2, issue1] },
  }]);
  const seed = await trigger.poll!({ params, state: {} }, ctx);
  const result = await trigger.poll!({ params, state: seed.nextState }, ctx);
  assertEquals(result.events, [issue2]);
});

test("new-issue: is idempotent for the same state and response", async () => {
  const state = { v: 1, kind: "ids", seeded: true, ids: [issue1.id] };
  const a = mockJiraCtx([{ body: { issues: [issue2, issue1] } }]);
  const b = mockJiraCtx([{ body: { issues: [issue2, issue1] } }]);
  assertEquals(
    await trigger.poll!({ params, state }, a.ctx),
    await trigger.poll!({ params, state }, b.ctx),
  );
});

test("new-issue: calls the issue search endpoint with literal newest-first JQL", async () => {
  const { ctx, calls } = mockJiraCtx([{ body: { issues: [] } }]);
  await trigger.poll!({ params, state: {} }, ctx);
  assertEquals(
    {
      method: calls[0].method,
      path: new URL(calls[0].url).pathname,
      body: JSON.parse(calls[0].body!),
    },
    {
      method: "POST",
      path: "/rest/api/3/search",
      body: { jql: "project = ENG ORDER BY created DESC", maxResults: 50, startAt: 0 },
    },
  );
});

for (
  const [name, jql, expected] of [
    [
      "strips ORDER BY rank",
      "project = ENG ORDER BY rank ASC",
      "project = ENG ORDER BY created DESC",
    ],
    [
      "strips lowercase order by",
      "project = ENG order by created",
      "project = ENG ORDER BY created DESC",
    ],
    [
      "keeps a quoted order by",
      'summary ~ "order by"',
      'summary ~ "order by" ORDER BY created DESC',
    ],
  ] as const
) {
  test(`new-issue: ${name}`, async () => {
    const { ctx, calls } = mockJiraCtx([{ body: { issues: [] } }]);
    await trigger.poll!({ params: { jql }, state: {} }, ctx);
    assertEquals(JSON.parse(calls[0].body!).jql, expected);
  });
}
