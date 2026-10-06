import { assertEquals, assertRejects } from "@std/assert";
import commentCreate from "../../actions/comment-create.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("comment-create: POST /comments sends a JSON:API document of attributes", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "data": { "id": "42", "type": "comments", "attributes": { "name": "x" } } },
  }]);
  const out = await commentCreate.execute({
    "body": "sample body",
    "taskId": 7,
    "projectId": 7,
    "dealId": 7,
    "discussionId": 7,
    "companyId": 7,
    "invoiceId": 7,
    "draft": true,
    "hidden": true,
  }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/comments");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].headers["content-type"], "application/vnd.api+json");
  assertEquals(calls[0].headers["x-auth-token"], undefined, "credentials belong to sign");
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    data: {
      type: "comments",
      attributes: {
        "body": "sample body",
        "task_id": 7,
        "project_id": 7,
        "deal_id": 7,
        "discussion_id": 7,
        "company_id": 7,
        "invoice_id": 7,
        "draft": true,
        "hidden": true,
      },
    },
  });
  assertEquals((out as Record<string, unknown>).id, "42");
});

Deno.test("comment-create: a vendor error surfaces its status, title and detail", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: errorBody("422", "unprocessable_entity", "Invalid", "is invalid"),
  }]);
  const err = await assertRejects(
    () => Promise.resolve(commentCreate.execute({ "body": "sample body" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("422"), true, err.message);
  assertEquals(err.message.includes("is invalid"), true, err.message);
});

Deno.test("comment-create: declares perform and idempotent=false", () => {
  assertEquals(commentCreate.type, "perform");
  assertEquals(commentCreate.idempotent, false);
  assertEquals(commentCreate.key, "comment-create");
});
