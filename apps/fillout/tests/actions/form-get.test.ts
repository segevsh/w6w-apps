import { assertEquals, assertRejects } from "@std/assert";
import formGet from "../../actions/form-get.ts";
import { errorBody, mockCtx, pathOf, US_ROOT } from "../_helpers.ts";

Deno.test("form-get: calls GET /v1/api/forms/{formId} and returns the body unchanged", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      id: "aB1",
      name: "Contact",
      questions: [{ id: "q1", name: "Email", type: "EmailInput" }],
    },
  }]);
  const out = await formGet.execute({ formId: "aB1" }, ctx) as {
    questions: Array<{ type: string }>;
  };

  assertEquals(calls[0].url, `${US_ROOT}/forms/aB1`);
  assertEquals(out.questions[0].type, "EmailInput");
});

/**
 * Fillout's standing warning on this endpoint is "new field types are added
 * regularly; your application should discard fields with unknown types". This
 * app must therefore not map or filter `type` — an unknown one has to survive
 * intact so the caller can make that decision.
 */
Deno.test("form-get: an undocumented question type passes through untouched", async () => {
  const { ctx } = mockCtx([{
    body: {
      id: "aB1",
      name: "F",
      questions: [{ id: "q9", name: "?", type: "SomethingNewIn2027" }],
    },
  }]);
  const out = await formGet.execute({ formId: "aB1" }, ctx) as {
    questions: Array<{ type: string }>;
  };
  assertEquals(out.questions[0].type, "SomethingNewIn2027");
});

Deno.test("form-get: a slash pasted into the id cannot escape the path segment", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await formGet.execute({ formId: "aB1/../../forms" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/api/forms/aB1%2F..%2F..%2Fforms");
});

Deno.test("form-get: a 404 keeps the vendor's own message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody(404, "Not Found", "Not Found") }]);
  const err = await assertRejects(
    () => Promise.resolve(formGet.execute({ formId: "nope" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("Fillout 404 Not Found"), true, err.message);
});
