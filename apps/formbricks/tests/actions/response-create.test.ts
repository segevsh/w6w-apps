import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/response-create.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("response-create: full input maps to the documented request", async () => {
  const { ctx, calls } = mockCtx([{ body: { "data": { "id": "x1" } } }]);
  const out = await action.execute!({
    "surveyId": "id_surveyId",
    "data": { "1": "x" },
    "finished": true,
    "language": "sample-language",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://app.formbricks.com/api/v1/management/responses");
  assertEquals(calls[0].method, "POST");
  assertEquals(decodeURIComponent(url.search), "");
  assertEquals(JSON.parse(calls[0].body!), {
    "surveyId": "id_surveyId",
    "data": { "1": "x" },
    "finished": true,
    "language": "sample-language",
  });
  assertEquals(out, { "data": { "id": "x1" } });
});

Deno.test("response-create: required input only maps to the documented request", async () => {
  const { ctx, calls } = mockCtx([{ body: { "data": { "id": "x1" } } }]);
  const out = await action.execute!({ "surveyId": "id_surveyId" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://app.formbricks.com/api/v1/management/responses");
  assertEquals(calls[0].method, "POST");
  assertEquals(decodeURIComponent(url.search), "");
  assertEquals(JSON.parse(calls[0].body!), { "surveyId": "id_surveyId" });
  assertEquals(out, { "data": { "id": "x1" } });
});

Deno.test("response-create: sends x-api-key never itself and no authorization header", async () => {
  const { ctx, calls } = mockCtx([{ body: { "data": { "id": "x1" } } }]);
  await action.execute!({ "surveyId": "id_surveyId" }, ctx);
  assert(!("x-api-key" in calls[0].headers), "the sign hook injects credentials, not actions");
  assert(!("authorization" in calls[0].headers));
});

Deno.test("response-create: surfaces a Formbricks error body as a thrown error", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: {
      code: "bad_request",
      message: "Fields are missing or incorrectly formatted",
      details: {},
    },
  }]);
  await assertRejects(
    async () => await action.execute!({ "surveyId": "id_surveyId" }, ctx),
    Error,
    "Fields are missing or incorrectly formatted",
  );
});
