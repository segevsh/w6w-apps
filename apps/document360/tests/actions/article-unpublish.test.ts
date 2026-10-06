import { assertEquals } from "@std/assert";
import articleUnpublish from "../../actions/article-unpublish.ts";
import { envelope, mockCtx, pathOf, PID, problem, PROBLEM_HEADERS, queryOf } from "../_helpers.ts";

Deno.test("article-unpublish: POSTs to /unpublish with the language as a query", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: envelope(null) }]);
  const out = await articleUnpublish.execute({
    articleId: "a1",
    workspaceId: "w1",
    versionNumber: 2,
    langCode: "fr",
  }, ctx) as { unpublished: boolean };

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), `/v3/projects/${PID}/articles/a1/unpublish`);
  assertEquals(queryOf(calls[0].url), { lang_code: "fr" });
  assertEquals(JSON.parse(calls[0].body!), { workspace_id: "w1", version_number: 2 });
  assertEquals(out.unpublished, true);
});

Deno.test("article-unpublish: a vendor error surfaces its code and message", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    headers: PROBLEM_HEADERS,
    body: problem(422, "VALIDATION_ERROR", "The field is required.", "title"),
  }]);
  let message = "";
  try {
    await articleUnpublish.execute({
      articleId: "a1",
      workspaceId: "w1",
      versionNumber: 2,
      langCode: "fr",
    }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("VALIDATION_ERROR"), true, message);
  assertEquals(message.includes("title: The field is required."), true, message);
});
