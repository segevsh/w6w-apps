import { assertEquals } from "@std/assert";
import { mockJiraCtx } from "../_helpers.ts";
import action from "../../actions/issue-search.ts";

Deno.test("issue-search: POSTs the JQL rather than putting it in the query string", async () => {
  const { ctx, calls } = mockJiraCtx([{ body: { issues: [], total: 0 } }]);
  await action.execute({ jql: "project = ENG" }, ctx);
  // JQL routinely outgrows a query string, and Jira supports POST.
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://acme.atlassian.net/rest/api/3/search");
  assertEquals(JSON.parse(calls[0].body!), {
    jql: "project = ENG",
    maxResults: 50,
    startAt: 0,
  });
});

Deno.test("issue-search: sends the field list as an array", async () => {
  const { ctx, calls } = mockJiraCtx([{ body: {} }]);
  await action.execute({ jql: "x", fields: "summary, status" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).fields, ["summary", "status"]);
});
