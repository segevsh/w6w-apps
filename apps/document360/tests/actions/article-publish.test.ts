import { assertEquals } from "@std/assert";
import articlePublish from "../../actions/article-publish.ts";
import { envelope, mockCtx, pathOf, PID, problem, PROBLEM_HEADERS, queryOf } from "../_helpers.ts";

Deno.test("article-publish: POSTs workspace_id and version_number", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: envelope(null) }]);
  const out = await articlePublish.execute({
    articleId: "a1",
    workspaceId: "w1",
    versionNumber: 3,
    message: "go",
  }, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), `/v3/projects/${PID}/articles/a1/publish`);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(JSON.parse(calls[0].body!), {
    workspace_id: "w1",
    version_number: 3,
    message: "go",
  });
  assertEquals(out, { published: true, articleId: "a1", versionNumber: 3 });
});

Deno.test("article-publish: a vendor error surfaces its code and message", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    headers: PROBLEM_HEADERS,
    body: problem(422, "VALIDATION_ERROR", "The field is required.", "title"),
  }]);
  let message = "";
  try {
    await articlePublish.execute({
      articleId: "a1",
      workspaceId: "w1",
      versionNumber: 3,
      message: "go",
    }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("VALIDATION_ERROR"), true, message);
  assertEquals(message.includes("title: The field is required."), true, message);
});
