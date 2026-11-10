import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-comment.ts";

test("new-comment seeds, emits, retries, and requests newest-first comments", async () => {
  const seed = await trigger.poll!(
    { params: { issueKey: "ENG-1" }, state: {} },
    mockCtx([{ body: { comments: [{ id: "a" }] } }]).ctx,
  );
  assertEquals(seed.events, []);
  assertEquals((seed.nextState as { seeded?: boolean }).seeded, true);
  const nextCtx = mockCtx([{ body: { comments: [{ id: "b" }, { id: "a" }] } }]);
  const next = await trigger.poll!(
    { params: { issueKey: "ENG-1" }, state: seed.nextState },
    nextCtx.ctx,
  );
  assertEquals(next.events, [{ id: "b" }]);
  const retry = await trigger.poll!(
    { params: { issueKey: "ENG-1" }, state: seed.nextState },
    mockCtx([{ body: { comments: [{ id: "b" }, { id: "a" }] } }]).ctx,
  );
  assertEquals(retry, next);
  assertEquals(
    nextCtx.calls[0].url,
    "https://jira.example.com/rest/api/2/issue/ENG-1/comment?orderBy=-created&maxResults=100&startAt=0",
  );
});
