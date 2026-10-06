import { assertEquals } from "@std/assert";
import articleCreate from "../../actions/article-create.ts";
import { envelope, mockCtx, pathOf, PID, problem, PROBLEM_HEADERS, queryOf } from "../_helpers.ts";

Deno.test("article-create: POSTs the documented body fields in snake_case", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: envelope({ id: "a1", status: "draft" }) }]);
  const out = await articleCreate.execute({
    workspaceId: "w1",
    categoryId: "c1",
    title: "Hi",
    content: "# Hi",
    contentType: "markdown",
    order: 0,
  }, ctx) as { id: string };

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), `/v3/projects/${PID}/articles`);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(JSON.parse(calls[0].body!), {
    title: "Hi",
    workspace_id: "w1",
    category_id: "c1",
    content: "# Hi",
    content_type: "markdown",
    order: 0,
  });
  assertEquals(out.id, "a1");
});

Deno.test("article-create: omits unset optionals rather than sending nulls", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: envelope({ id: "a2" }) }]);
  const out = await articleCreate.execute(
    { workspaceId: "w1", categoryId: "c1", title: "Hi" },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), `/v3/projects/${PID}/articles`);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(JSON.parse(calls[0].body!), { title: "Hi", workspace_id: "w1", category_id: "c1" });
  assertEquals(typeof out, "object");
});

Deno.test("article-create: a vendor error surfaces its code and message", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    headers: PROBLEM_HEADERS,
    body: problem(422, "VALIDATION_ERROR", "The field is required.", "title"),
  }]);
  let message = "";
  try {
    await articleCreate.execute({
      workspaceId: "w1",
      categoryId: "c1",
      title: "Hi",
      content: "# Hi",
      contentType: "markdown",
      order: 0,
    }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("VALIDATION_ERROR"), true, message);
  assertEquals(message.includes("title: The field is required."), true, message);
});
