import { assertEquals } from "@std/assert";
import articleArchive from "../../actions/article-archive.ts";
import { envelope, mockCtx, pathOf, PID, problem, PROBLEM_HEADERS, queryOf } from "../_helpers.ts";

Deno.test("article-archive: POSTs to /archive", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: envelope({ is_archived: true }) }]);
  const out = await articleArchive.execute({ articleId: "a1", langCode: "en" }, ctx) as {
    is_archived: boolean;
  };

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), `/v3/projects/${PID}/articles/a1/archive`);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(JSON.parse(calls[0].body!), { lang_code: "en" });
  assertEquals(out.is_archived, true);
});

Deno.test("article-archive: a vendor error surfaces its code and message", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    headers: PROBLEM_HEADERS,
    body: problem(422, "VALIDATION_ERROR", "The field is required.", "title"),
  }]);
  let message = "";
  try {
    await articleArchive.execute({ articleId: "a1", langCode: "en" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("VALIDATION_ERROR"), true, message);
  assertEquals(message.includes("title: The field is required."), true, message);
});
