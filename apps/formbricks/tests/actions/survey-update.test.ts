import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/survey-update.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("survey-update: full input maps to the documented request", async () => {
  const { ctx, calls } = mockCtx([{ body: { "data": { "id": "x1" } } }]);
  const out = await action.execute!({
    "surveyId": "id_surveyId",
    "name": "sample-name",
    "status": "draft",
    "displayOption": "displayOnce",
    "questions": [{ "id": "q1" }],
    "endings": [{ "id": "q1" }],
    "fields": { "1": "x" },
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(
    url.origin + url.pathname,
    "https://app.formbricks.com/api/v1/management/surveys/id_surveyId",
  );
  assertEquals(calls[0].method, "PUT");
  assertEquals(decodeURIComponent(url.search), "");
  assertEquals(JSON.parse(calls[0].body!), {
    "1": "x",
    "name": "sample-name",
    "status": "draft",
    "displayOption": "displayOnce",
    "questions": [{ "id": "q1" }],
    "endings": [{ "id": "q1" }],
  });
  assertEquals(out, { "data": { "id": "x1" } });
});

Deno.test("survey-update: required input only maps to the documented request", async () => {
  const { ctx, calls } = mockCtx([{ body: { "data": { "id": "x1" } } }]);
  const out = await action.execute!({ "surveyId": "id_surveyId" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(
    url.origin + url.pathname,
    "https://app.formbricks.com/api/v1/management/surveys/id_surveyId",
  );
  assertEquals(calls[0].method, "PUT");
  assertEquals(decodeURIComponent(url.search), "");
  assertEquals(JSON.parse(calls[0].body!), {});
  assertEquals(out, { "data": { "id": "x1" } });
});

Deno.test("survey-update: sends x-api-key never itself and no authorization header", async () => {
  const { ctx, calls } = mockCtx([{ body: { "data": { "id": "x1" } } }]);
  await action.execute!({ "surveyId": "id_surveyId" }, ctx);
  assert(!("x-api-key" in calls[0].headers), "the sign hook injects credentials, not actions");
  assert(!("authorization" in calls[0].headers));
});

Deno.test("survey-update: surfaces a Formbricks error body as a thrown error", async () => {
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
