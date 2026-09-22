import { assertEquals, assertRejects } from "@std/assert";
import { mockNocrmCtx } from "../_helpers.ts";
import action from "../../actions/lead-create.ts";

Deno.test("lead-create: POSTs the required title and description", async () => {
  const { ctx, calls } = mockNocrmCtx([{ status: 201, body: { id: 8113 } }]);
  await action.execute({ title: "Awesome Company", description: "Firstname: John" }, ctx);
  assertEquals(calls[0].url, "https://acme.nocrm.io/api/v2/leads");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.title, "Awesome Company");
  assertEquals(body.description, "Firstname: John");
  // Everything the caller left alone is absent, not sent as null.
  assertEquals("user_id" in body, false);
  assertEquals("tags" in body, false);
});

Deno.test("lead-create: maps assignment, step, created_at and tags", async () => {
  const { ctx, calls } = mockNocrmCtx([{ status: 201, body: {} }]);
  await action.execute({
    title: "Acme",
    description: "d",
    userId: "stef@example.com",
    step: "Contacted",
    createdAt: "2014-02-28 17:37:33",
    tags: ["prospect", "google"],
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.user_id, "stef@example.com");
  assertEquals(body.step, "Contacted");
  assertEquals(body.created_at, "2014-02-28 17:37:33");
  assertEquals(body.tags, ["prospect", "google"]);
});

Deno.test("lead-create: surfaces the vendor's own error type", async () => {
  const { ctx } = mockNocrmCtx([{
    status: 422,
    body: { error: 422, message: "title is missing", type: "missing_parameter" },
  }]);
  await assertRejects(
    () => Promise.resolve(action.execute({ title: "t", description: "d" }, ctx)),
    Error,
    "missing_parameter",
  );
});
