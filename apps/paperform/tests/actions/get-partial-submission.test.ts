import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import getPartialSubmission from "../../actions/get-partial-submission.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

test("get-partial-submission: GETs /v1/partial-submissions/{id}, reads the hyphenated key", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: envelope({ "partial-submission": { id: "ps1" } }),
  }]);
  const out = await getPartialSubmission.execute({ id: "ps1" }, ctx) as {
    partialSubmission?: { id?: string };
  };
  assertEquals(pathOf(calls[0].url), "/v1/partial-submissions/ps1");
  assertEquals(out.partialSubmission?.id, "ps1");
});
