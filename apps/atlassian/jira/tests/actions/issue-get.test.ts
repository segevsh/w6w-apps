import { assertEquals } from "@std/assert";
import { mockJiraCtx } from "../_helpers.ts";
import action from "../../actions/issue-get.ts";

Deno.test("issue-get: GETs /issue/{key}", async () => {
  const { ctx, calls } = mockJiraCtx([{ body: { key: "ENG-1" } }]);
  await action.execute({ issueKey: "ENG-1" }, ctx);
  assertEquals(calls[0].url, "https://acme.atlassian.net/rest/api/3/issue/ENG-1");
});

Deno.test("issue-get: passes the field and expand filters through", async () => {
  const { ctx, calls } = mockJiraCtx([{ body: {} }]);
  await action.execute({ issueKey: "ENG-1", fields: "summary,status", expand: "changelog" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("fields"), "summary,status");
  assertEquals(q.get("expand"), "changelog");
});
