import { assertEquals } from "@std/assert";
import categoryPublish from "../../actions/category-publish.ts";
import { envelope, mockCtx, pathOf, PID, problem, PROBLEM_HEADERS, queryOf } from "../_helpers.ts";

Deno.test("category-publish: POSTs workspace_id and version_number", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: envelope(null) }]);
  const out = await categoryPublish.execute({
    categoryId: "c1",
    workspaceId: "w1",
    versionNumber: 1,
    langCode: "en",
  }, ctx) as { published: boolean };

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), `/v3/projects/${PID}/categories/c1/publish`);
  assertEquals(queryOf(calls[0].url), { lang_code: "en" });
  assertEquals(JSON.parse(calls[0].body!), { workspace_id: "w1", version_number: 1 });
  assertEquals(out.published, true);
});

Deno.test("category-publish: a vendor error surfaces its code and message", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    headers: PROBLEM_HEADERS,
    body: problem(422, "VALIDATION_ERROR", "The field is required.", "title"),
  }]);
  let message = "";
  try {
    await categoryPublish.execute({
      categoryId: "c1",
      workspaceId: "w1",
      versionNumber: 1,
      langCode: "en",
    }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("VALIDATION_ERROR"), true, message);
  assertEquals(message.includes("title: The field is required."), true, message);
});
