import { assertEquals } from "@std/assert";
import articleSettingsGet from "../../actions/article-settings-get.ts";
import { envelope, mockCtx, pathOf, PID, problem, PROBLEM_HEADERS, queryOf } from "../_helpers.ts";

Deno.test("article-settings-get: GETs the settings", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: envelope({ slug: "hi", seo_title: "Hi" }),
  }]);
  const out = await articleSettingsGet.execute({ articleId: "a1" }, ctx) as { slug: string };

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), `/v3/projects/${PID}/articles/a1/settings`);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
  assertEquals(out.slug, "hi");
});

Deno.test("article-settings-get: a vendor error surfaces its code and message", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    headers: PROBLEM_HEADERS,
    body: problem(422, "VALIDATION_ERROR", "The field is required.", "title"),
  }]);
  let message = "";
  try {
    await articleSettingsGet.execute({ articleId: "a1" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("VALIDATION_ERROR"), true, message);
  assertEquals(message.includes("title: The field is required."), true, message);
});
