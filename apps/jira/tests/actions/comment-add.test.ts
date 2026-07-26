import { assertEquals } from "@std/assert";
import { mockJiraCtx } from "../_helpers.ts";
import action from "../../actions/comment-add.ts";

Deno.test("comment-add: POSTs an ADF body", async () => {
  const { ctx, calls } = mockJiraCtx([{ body: { id: "1" } }]);
  await action.execute({ issueKey: "ENG-1", body: "looks good" }, ctx);
  assertEquals(calls[0].url, "https://acme.atlassian.net/rest/api/3/issue/ENG-1/comment");
  assertEquals(JSON.parse(calls[0].body!).body.type, "doc");
});

Deno.test("comment-add: a role restriction becomes a visibility block", async () => {
  const { ctx, calls } = mockJiraCtx([{ body: {} }]);
  await action.execute({ issueKey: "ENG-1", body: "x", visibilityRole: "Administrators" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).visibility, {
    type: "role",
    value: "Administrators",
  });
});
