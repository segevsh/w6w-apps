import { assertEquals, assertRejects } from "@std/assert";
import submissionCreate from "../../actions/submission-create.ts";
import { mockCtx, pathOf, zodErrorBody } from "../_helpers.ts";

const one = { questions: [{ id: "q1", value: "a@b.com" }] };

Deno.test("submission-create: posts {submissions: [...]} and reports what came back", async () => {
  const { ctx, calls } = mockCtx([{
    body: { submissions: [{ submissionId: "s1", submissionTime: "2026-08-01T10:00:00.000Z" }] },
  }]);
  const out = await submissionCreate.execute({ formId: "aB1", submissions: [one] }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/api/forms/aB1/submissions");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { submissions: [one] });
  assertEquals(out.createdCount, 1);
});

/** The host may hand a `json` param through as the string the user typed. */
Deno.test("submission-create: a JSON string param is parsed before sending", async () => {
  const { ctx, calls } = mockCtx([{ body: { submissions: [] } }]);
  await submissionCreate.execute({ formId: "aB1", submissions: JSON.stringify([one]) }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { submissions: [one] });
});

/**
 * A single object is the shape people reach for first, and the API accepts only
 * an array — so wrapping it turns a guaranteed 400 into a working call.
 */
Deno.test("submission-create: a lone submission object is wrapped in an array", async () => {
  const { ctx, calls } = mockCtx([{ body: { submissions: [] } }]);
  await submissionCreate.execute({ formId: "aB1", submissions: one }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { submissions: [one] });
});

/**
 * `maxItems: 10` is the vendor's own bound. Refusing locally costs one wasted
 * round trip less than letting Fillout refuse — and at 5 requests/second, round
 * trips are the scarce resource.
 */
Deno.test("submission-create: more than ten submissions is refused before the request", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        submissionCreate.execute({ formId: "aB1", submissions: Array(11).fill(one) }, ctx),
      ),
    Error,
  );
  assertEquals(err.message.includes("at most 10"), true, err.message);
  assertEquals(calls.length, 0, "it must not have made the request");
});

Deno.test("submission-create: malformed JSON is reported as such, not sent", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(
    () =>
      Promise.resolve(submissionCreate.execute({ formId: "aB1", submissions: "{not json" }, ctx)),
    Error,
  );
  assertEquals(err.message, "Submissions is not valid JSON");
  assertEquals(calls.length, 0);
});

/**
 * **The trap this endpoint is famous for.** Fillout validates this route's body
 * *before* it authenticates, so a rejected body answers `400` with a
 * stringified Zod issue list and no mention of the credential — while every
 * credential failure on this API is *also* a `400`. Reading the status alone
 * would report "bad API key" for a typo in a question id.
 */
Deno.test("submission-create: a body-validation 400 is reported as a body problem, not an auth one", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: zodErrorBody([
      {
        expected: "array",
        code: "invalid_type",
        path: ["submissions"],
        message: "Invalid input: expected array, received undefined",
      },
    ]),
  }]);
  const err = await assertRejects(
    () => Promise.resolve(submissionCreate.execute({ formId: "aB1", submissions: [one] }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("request body rejected"), true, err.message);
  assertEquals(
    err.message.includes("submissions: Invalid input: expected array, received undefined"),
    true,
    err.message,
  );
  // …and it must not have been dressed up as a credential problem.
  assertEquals(/api key|reconnect|revoked/i.test(err.message), false, err.message);
});

Deno.test("submission-create: is not idempotent, because Fillout offers no key to make it so", () => {
  assertEquals(submissionCreate.idempotent, false);
});
