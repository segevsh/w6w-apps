import { assertEquals } from "@std/assert";
import articleUpdate from "../../actions/article-update.ts";
import { envelope, mockCtx, pathOf, PID, problem, PROBLEM_HEADERS, queryOf } from "../_helpers.ts";

Deno.test("article-update: PATCHes only the fields that were set", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: envelope({ id: "a1", title: "New" }) }]);
  const out = await articleUpdate.execute({
    articleId: "a1",
    title: "New",
    hidden: false,
    autoFork: true,
    langCode: "en",
  }, ctx) as { title: string };

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), `/v3/projects/${PID}/articles/a1`);
  assertEquals(queryOf(calls[0].url), { lang_code: "en" });
  assertEquals(JSON.parse(calls[0].body!), { title: "New", hidden: false, auto_fork: true });
  assertEquals(out.title, "New");
});

Deno.test("article-update: a vendor error surfaces its code and message", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    headers: PROBLEM_HEADERS,
    body: problem(422, "VALIDATION_ERROR", "The field is required.", "title"),
  }]);
  let message = "";
  try {
    await articleUpdate.execute({
      articleId: "a1",
      title: "New",
      hidden: false,
      autoFork: true,
      langCode: "en",
    }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("VALIDATION_ERROR"), true, message);
  assertEquals(message.includes("title: The field is required."), true, message);
});
