import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import issueSearch from "../../actions/issue-search.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("issue-search: POSTs JQL to /search with default pagination", async () => {
  const { ctx, calls } = mockCtx([{ body: { issues: [], total: 0, startAt: 0 } }]);
  await issueSearch.execute({ jql: "project = ENG" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/rest/api/2/search");
  const body = JSON.parse(calls[0].body!) as Record<string, unknown>;
  assertEquals(body.jql, "project = ENG");
  assertEquals(body.maxResults, 50);
  assertEquals(body.startAt, 0);
  assertEquals(body.fields, undefined);
});

test("issue-search: splits comma-separated fields and expand", async () => {
  const { ctx, calls } = mockCtx([{ body: { issues: [], total: 0, startAt: 0 } }]);
  await issueSearch.execute({
    jql: "project = ENG",
    fields: "summary, status",
    expand: "changelog, renderedFields",
  }, ctx);
  const body = JSON.parse(calls[0].body!) as Record<string, unknown>;
  assertEquals(body.fields, ["summary", "status"]);
  assertEquals(body.expand, ["changelog", "renderedFields"]);
});
