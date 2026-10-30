import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/submission-documents-get.ts";

test("submission-documents-get: reads a submission's documents", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { id: 1, documents: [{ name: "example", url: "https://docuseal.com/file/x.pdf" }] },
  }]);
  const out = await action.execute!({ id: 1 }, ctx);
  assertEquals(calls[0].url, "https://api.docuseal.com/submissions/1/documents");
  assertEquals(calls[0].method, "GET");
  assertEquals(out, {
    id: 1,
    documents: [{ name: "example", url: "https://docuseal.com/file/x.pdf" }],
  });
});
