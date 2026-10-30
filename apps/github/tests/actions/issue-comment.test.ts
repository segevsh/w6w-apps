import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/issue-comment.ts";

test("issue-comment: POSTs to the issue comments route", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 9 } }]);
  await action.execute({ owner: "acme", repository: "api", issueNumber: 4, body: "ack" }, ctx);
  assertEquals(calls[0].url, "https://api.github.com/repos/acme/api/issues/4/comments");
  assertEquals(JSON.parse(calls[0].body!), { body: "ack" });
});
