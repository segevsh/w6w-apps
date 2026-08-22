import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/document-publish.ts";

const conn = { display: { projectId: "abc123", dataset: "production", useCdn: true } };

/** Publishing goes through the Actions API, which owns the semantics. */
Deno.test("document-publish: dispatches a publish action, not a replace-plus-delete", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { transactionId: "t1" } }], conn);
  await action.execute!({ publishedId: "article-1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v2025-02-19/data/actions/production");
  assertEquals(JSON.parse(calls[0].body!), {
    actions: [{
      actionType: "sanity.action.document.publish",
      draftId: "drafts.article-1",
      publishedId: "article-1",
    }],
  });
  // A write, so never the CDN.
  assertEquals(new URL(calls[0].url).host, "abc123.api.sanity.io");
});

/** Passing the draft id is the obvious mistake, so it is named. */
Deno.test("document-publish: a drafts.-prefixed id is refused with an explanation", async () => {
  const { ctx, calls } = mockCtx([], conn);
  const err = await assertRejects(
    async () => await action.execute!({ publishedId: "drafts.article-1" }, ctx),
    Error,
  );
  assert(/WITHOUT the `drafts.` prefix/.test(String(err)), String(err));
  assertEquals(calls.length, 0);
});

/** The Studio's schema is not enforced by the API. */
Deno.test("document-publish: says the schema is not enforced here", () => {
  assert(/schema is not enforced/i.test(action.description!), action.description);
});
