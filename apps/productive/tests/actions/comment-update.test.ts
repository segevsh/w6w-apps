import { assertEquals, assertRejects } from "@std/assert";
import commentUpdate from "../../actions/comment-update.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("comment-update: PATCH /comments/{id} sends a JSON:API document of attributes", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "data": { "id": "42", "type": "comments", "attributes": { "name": "x" } } },
  }]);
  const out = await commentUpdate.execute({
    "id": "42",
    "body": "sample body",
    "draft": true,
    "hidden": true,
  }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/api/v2/comments/42");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].headers["content-type"], "application/vnd.api+json");
  assertEquals(calls[0].headers["x-auth-token"], undefined, "credentials belong to sign");
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    data: {
      type: "comments",
      attributes: { "body": "sample body", "draft": true, "hidden": true },
    },
  });
  assertEquals((out as Record<string, unknown>).id, "42");
});

Deno.test("comment-update: only the fields set are sent", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "data": { "id": "42", "type": "comments", "attributes": { "name": "x" } } },
  }]);
  await commentUpdate.execute({ id: "42", body: "sample body" }, ctx);
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    data: { type: "comments", attributes: { "body": "sample body" } },
  });
});

Deno.test("comment-update: naming no field to change fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(
    () => Promise.resolve(commentUpdate.execute({ id: "42" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("at least one field"), true, err.message);
  assertEquals(calls.length, 0);
});

Deno.test("comment-update: a vendor error surfaces its status, title and detail", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: errorBody("404", "not_found", "Not Found", "Resource not found"),
  }]);
  const err = await assertRejects(
    () => Promise.resolve(commentUpdate.execute({ id: "42", body: "sample body" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("404"), true, err.message);
  assertEquals(err.message.includes("Resource not found"), true, err.message);
});

Deno.test("comment-update: declares perform and idempotent=true", () => {
  assertEquals(commentUpdate.type, "perform");
  assertEquals(commentUpdate.idempotent, true);
  assertEquals(commentUpdate.key, "comment-update");
});
