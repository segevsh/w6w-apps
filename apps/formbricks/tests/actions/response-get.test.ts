import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/response-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("response-get: full input maps to the documented request", async () => {
  const { ctx, calls } = mockCtx([{ body: { "data": { "id": "x1" } } }]);
  const out = await action.execute!({ "responseId": "id_responseId" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(
    url.origin + url.pathname,
    "https://app.formbricks.com/api/v1/management/responses/id_responseId",
  );
  assertEquals(calls[0].method, "GET");
  assertEquals(decodeURIComponent(url.search), "");
  assertEquals(calls[0].body, null);
  assertEquals(out, { "data": { "id": "x1" } });
});

Deno.test("response-get: sends x-api-key never itself and no authorization header", async () => {
  const { ctx, calls } = mockCtx([{ body: { "data": { "id": "x1" } } }]);
  await action.execute!({ "responseId": "id_responseId" }, ctx);
  assert(!("x-api-key" in calls[0].headers), "the sign hook injects credentials, not actions");
  assert(!("authorization" in calls[0].headers));
});

Deno.test("response-get: surfaces a Formbricks error body as a thrown error", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: {
      code: "bad_request",
      message: "Fields are missing or incorrectly formatted",
      details: {},
    },
  }]);
  await assertRejects(
    async () => await action.execute!({ "responseId": "id_responseId" }, ctx),
    Error,
    "Fields are missing or incorrectly formatted",
  );
});
