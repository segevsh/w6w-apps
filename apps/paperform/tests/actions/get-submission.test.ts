import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import getSubmission from "../../actions/get-submission.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

test("get-submission: GETs /v1/submissions/{id}, no form scope needed", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: envelope({ submission: { id: "s1" } }) }]);
  const out = await getSubmission.execute({ id: "s1" }, ctx) as { submission?: { id?: string } };
  assertEquals(pathOf(calls[0].url), "/v1/submissions/s1");
  assertEquals(out.submission?.id, "s1");
});
