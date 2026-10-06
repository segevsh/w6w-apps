import { assertEquals } from "@std/assert";
import articleGet from "../../actions/article-get.ts";
import { envelope, mockCtx, pathOf, PID, problem, PROBLEM_HEADERS, queryOf } from "../_helpers.ts";

Deno.test("article-get: GETs the article with its query flags", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: envelope({ id: "a1", title: "Hi", status: "published" }),
  }]);
  const out = await articleGet.execute({
    articleId: "a1",
    langCode: "en",
    contentMode: "display",
    published: true,
  }, ctx) as { status: string };

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), `/v3/projects/${PID}/articles/a1`);
  assertEquals(queryOf(calls[0].url), {
    lang_code: "en",
    content_mode: "display",
    published: "true",
  });
  assertEquals(calls[0].body, null);
  assertEquals(out.status, "published");
});

Deno.test("article-get: a vendor error surfaces its code and message", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    headers: PROBLEM_HEADERS,
    body: problem(422, "VALIDATION_ERROR", "The field is required.", "title"),
  }]);
  let message = "";
  try {
    await articleGet.execute({
      articleId: "a1",
      langCode: "en",
      contentMode: "display",
      published: true,
    }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("VALIDATION_ERROR"), true, message);
  assertEquals(message.includes("title: The field is required."), true, message);
});
