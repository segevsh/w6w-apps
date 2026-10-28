import { assertEquals } from "@std/assert";
import { mockJiraCtx } from "../_helpers.ts";
import action from "../../actions/issue-transition.ts";

Deno.test("issue-transition: POSTs the transition id", async () => {
  const { ctx, calls } = mockJiraCtx([{ status: 204 }]);
  await action.execute({ issueKey: "ENG-1", transitionId: "31" }, ctx);
  assertEquals(calls[0].url, "https://acme.atlassian.net/rest/api/3/issue/ENG-1/transitions");
  assertEquals(JSON.parse(calls[0].body!), { transition: { id: "31" } });
});

Deno.test("issue-transition: a comment rides along in the ADF `update` block", async () => {
  const { ctx, calls } = mockJiraCtx([{ status: 204 }]);
  await action.execute({ issueKey: "ENG-1", transitionId: "31", comment: "done" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.update.comment[0].add.body.type, "doc");
});

Deno.test("issue-transition: a resolution goes in `fields`", async () => {
  const { ctx, calls } = mockJiraCtx([{ status: 204 }]);
  await action.execute({ issueKey: "ENG-1", transitionId: "31", resolution: "Done" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).fields, { resolution: { name: "Done" } });
});
