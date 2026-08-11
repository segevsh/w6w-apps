import { assertEquals, assertRejects } from "@std/assert";
import formList from "../../actions/form-list.ts";
import { errorBody, EU_ROOT, mockCtx, US_ROOT } from "../_helpers.ts";

Deno.test("form-list: calls GET /v1/api/forms and counts the bare array", async () => {
  const { ctx, calls } = mockCtx([{
    body: [{ name: "Contact", formId: "aB1" }, { name: "Survey", formId: "cD2" }],
  }]);
  const out = await formList.execute({}, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, `${US_ROOT}/forms`);
  assertEquals(out.formCount, 2);
  assertEquals(out.forms[1].formId, "cD2");
});

/**
 * Fillout returns a **bare array**, not `{data: […]}`. A client that unwrapped
 * an envelope would return `undefined` here, so the shape is pinned.
 */
Deno.test("form-list: an empty account yields an empty array, not undefined", async () => {
  const { ctx } = mockCtx([{ body: [] }]);
  const out = await formList.execute({}, ctx);
  assertEquals(out.forms, []);
  assertEquals(out.formCount, 0);
});

Deno.test("form-list: an EU connection is routed to eu-api.fillout.com", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }], { region: "eu" });
  await formList.execute({}, ctx);
  assertEquals(calls[0].url, `${EU_ROOT}/forms`);
});

/**
 * The credential-failure trap: this is a 400, not a 401, and only the message
 * says what went wrong. The thrown error must carry the vendor's own sentence
 * plus the advice derived from it.
 */
Deno.test("form-list: a rejected key surfaces as an actionable 400, not a bare status", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: errorBody(400, "Bad Request", "API Key invalid"),
  }]);
  const err = await assertRejects(() => Promise.resolve(formList.execute({}, ctx)), Error);
  assertEquals(err.message.includes("API Key invalid"), true, err.message);
  assertEquals(err.message.includes("regenerated or revoked"), true, err.message);
});

Deno.test("form-list: a 429 explains the 5-requests-per-second ceiling", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    body: errorBody(429, "Too Many Requests", "Too many requests. Try again soon."),
  }]);
  const err = await assertRejects(() => Promise.resolve(formList.execute({}, ctx)), Error);
  assertEquals(err.message.includes("5 requests/second"), true, err.message);
});
