import { assertEquals } from "@std/assert";
import articleDelete from "../../actions/article-delete.ts";
import { mockCtx, pathOf, PID, problem, PROBLEM_HEADERS, queryOf } from "../_helpers.ts";

Deno.test("article-delete: DELETEs and reports the id on a 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await articleDelete.execute({ articleId: "a1" }, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), `/v3/projects/${PID}/articles/a1`);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
  assertEquals(out, { deleted: true, articleId: "a1" });
});

Deno.test("article-delete: a vendor error surfaces its code and message", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    headers: PROBLEM_HEADERS,
    body: problem(422, "VALIDATION_ERROR", "The field is required.", "title"),
  }]);
  let message = "";
  try {
    await articleDelete.execute({ articleId: "a1" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("VALIDATION_ERROR"), true, message);
  assertEquals(message.includes("title: The field is required."), true, message);
});
