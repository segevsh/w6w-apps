import { assertEquals } from "@std/assert";
import { mockJiraCtx } from "../_helpers.ts";
import action from "../../actions/issue-create.ts";

const BASE = { projectKey: "ENG", issueType: "Task", summary: "Fix login" };

Deno.test("issue-create: POSTs /issue with the fields envelope", async () => {
  const { ctx, calls } = mockJiraCtx([{ body: { key: "ENG-1" } }]);
  await action.execute(BASE, ctx);
  assertEquals(calls[0].url, "https://acme.atlassian.net/rest/api/3/issue");
  assertEquals(JSON.parse(calls[0].body!), {
    fields: { project: { key: "ENG" }, issuetype: { name: "Task" }, summary: "Fix login" },
  });
});

Deno.test("issue-create: converts a plain description into ADF", async () => {
  const { ctx, calls } = mockJiraCtx([{ body: {} }]);
  await action.execute({ ...BASE, description: "It broke" }, ctx);
  // API v3 rejects a bare string here.
  assertEquals(JSON.parse(calls[0].body!).fields.description, {
    type: "doc",
    version: 1,
    content: [{ type: "paragraph", content: [{ type: "text", text: "It broke" }] }],
  });
});

Deno.test("issue-create: wraps assignee and priority in the shapes Jira expects", async () => {
  const { ctx, calls } = mockJiraCtx([{ body: {} }]);
  await action.execute({ ...BASE, assigneeId: "acct-1", priority: "High" }, ctx);
  const f = JSON.parse(calls[0].body!).fields;
  assertEquals(f.assignee, { id: "acct-1" });
  assertEquals(f.priority, { name: "High" });
});

Deno.test("issue-create: merges additional fields alongside the built-in ones", async () => {
  const { ctx, calls } = mockJiraCtx([{ body: {} }]);
  await action.execute({ ...BASE, additionalFields: { customfield_10010: "x" } }, ctx);
  const f = JSON.parse(calls[0].body!).fields;
  assertEquals(f.customfield_10010, "x");
  assertEquals(f.summary, "Fix login");
});

Deno.test("issue-create: splits labels and drops the empty case", async () => {
  const withLabels = mockJiraCtx([{ body: {} }]);
  await action.execute({ ...BASE, labels: "p1, backend" }, withLabels.ctx);
  assertEquals(JSON.parse(withLabels.calls[0].body!).fields.labels, ["p1", "backend"]);

  const without = mockJiraCtx([{ body: {} }]);
  await action.execute({ ...BASE, labels: "" }, without.ctx);
  assertEquals("labels" in JSON.parse(without.calls[0].body!).fields, false);
});
