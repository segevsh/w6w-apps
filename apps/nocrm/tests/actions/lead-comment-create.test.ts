import { assertEquals, assertRejects } from "@std/assert";
import { mockNocrmCtx } from "../_helpers.ts";
import action from "../../actions/lead-comment-create.ts";

Deno.test("lead-comment-create: POSTs the content to the lead's comments", async () => {
  const { ctx, calls } = mockNocrmCtx([{ status: 201, body: { id: 99 } }]);
  await action.execute({ leadId: "2999", content: "this is a content" }, ctx);
  assertEquals(calls[0].url, "https://acme.nocrm.io/api/v2/leads/2999/comments");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { content: "this is a content" });
});

Deno.test("lead-comment-create: maps the optional author", async () => {
  const { ctx, calls } = mockNocrmCtx([{ status: 201, body: {} }]);
  await action.execute({ leadId: "2999", content: "hi", userId: "stef@example.com" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    content: "hi",
    user_id: "stef@example.com",
  });
});

Deno.test("lead-comment-create: a missing lead surfaces record_not_found", async () => {
  const { ctx } = mockNocrmCtx([{
    status: 404,
    body: { error: 404, message: "Record not found", type: "record_not_found" },
  }]);
  await assertRejects(
    () => Promise.resolve(action.execute({ leadId: "1", content: "x" }, ctx)),
    Error,
    "record_not_found",
  );
});
