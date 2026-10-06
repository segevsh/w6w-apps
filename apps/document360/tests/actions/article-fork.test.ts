import { assertEquals } from "@std/assert";
import articleFork from "../../actions/article-fork.ts";
import { envelope, mockCtx, pathOf, PID, problem, PROBLEM_HEADERS, queryOf } from "../_helpers.ts";

Deno.test("article-fork: POSTs the version to fork", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: envelope({ id: "a1", version_number: 3 }),
  }]);
  const out = await articleFork.execute({ articleId: "a1", versionNumber: 2 }, ctx) as {
    version_number: number;
  };

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), `/v3/projects/${PID}/articles/a1/fork`);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(JSON.parse(calls[0].body!), { version_number: 2 });
  assertEquals(out.version_number, 3);
});

Deno.test("article-fork: a vendor error surfaces its code and message", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    headers: PROBLEM_HEADERS,
    body: problem(422, "VALIDATION_ERROR", "The field is required.", "title"),
  }]);
  let message = "";
  try {
    await articleFork.execute({ articleId: "a1", versionNumber: 2 }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("VALIDATION_ERROR"), true, message);
  assertEquals(message.includes("title: The field is required."), true, message);
});
