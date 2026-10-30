import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import formSubmissionGet from "../../actions/form-submission-get.ts";
import { doc, mockCtx, pathOf, queryOf } from "../_helpers.ts";

test("form-submission-get: GETs the resource by id", async () => {
  const { ctx, calls } = mockCtx([{ body: doc("7") }]);
  await formSubmissionGet.execute({ id: "7" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0]), "/v1/form_submissions/7");
});

test("form-submission-get: an id with a slash is percent-encoded, not path-injected", async () => {
  const { ctx, calls } = mockCtx([{ body: doc() }]);
  await formSubmissionGet.execute({ id: "a/b" }, ctx);
  assertEquals(pathOf(calls[0]), "/v1/form_submissions/a%2Fb");
});

test("form-submission-get: sends no fieldset or include — the spec declares neither", async () => {
  const { ctx, calls } = mockCtx([{ body: doc("7") }]);
  await formSubmissionGet.execute({ id: "7" }, ctx);
  assertEquals(queryOf(calls[0]), {});
});
