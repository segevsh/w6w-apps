import { test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/document-unpublish.ts";

const conn = { display: { projectId: "abc123", dataset: "production" } };

test("document-unpublish: dispatches an unpublish action", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { transactionId: "t1" } }], conn);
  await action.execute!({ publishedId: "article-1" }, ctx);
  assertEquals(
    JSON.parse(calls[0].body!).actions[0].actionType,
    "sanity.action.document.unpublish",
  );
});

test("document-unpublish: a drafts.-prefixed id is refused", async () => {
  const { ctx } = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ publishedId: "drafts.a" }, ctx),
    Error,
    "drafts.",
  );
});

/** The content survives — that is the whole difference from a delete. */
test("document-unpublish: says the content survives", () => {
  assert(/survives/.test(action.description!), action.description);
});
