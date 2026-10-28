import { assertEquals } from "@std/assert";
import { mockJiraCtx } from "../_helpers.ts";
import action from "../../actions/issue-assign.ts";

Deno.test("issue-assign: PUTs the account id", async () => {
  const { ctx, calls } = mockJiraCtx([{ status: 204 }]);
  await action.execute({ issueKey: "ENG-1", accountId: "acct-1" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url, "https://acme.atlassian.net/rest/api/3/issue/ENG-1/assignee");
  assertEquals(JSON.parse(calls[0].body!), { accountId: "acct-1" });
});

Deno.test("issue-assign: an empty account id sends explicit null to unassign", async () => {
  const { ctx, calls } = mockJiraCtx([{ status: 204 }]);
  await action.execute({ issueKey: "ENG-1" }, ctx);
  // Omitting the key would be a no-op; null is how Jira unassigns.
  assertEquals(JSON.parse(calls[0].body!), { accountId: null });
});
