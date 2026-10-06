import { assertEquals } from "@std/assert";
import categoryCreate from "../../actions/category-create.ts";
import { envelope, mockCtx, pathOf, PID, problem, PROBLEM_HEADERS, queryOf } from "../_helpers.ts";

Deno.test("category-create: POSTs name, workspace and parent", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: envelope({ id: "c1", name: "Guides" }) }]);
  const out = await categoryCreate.execute({
    workspaceId: "w1",
    name: "Guides",
    parentCategoryId: "c0",
    categoryType: "folder",
    hidden: false,
  }, ctx) as { id: string };

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), `/v3/projects/${PID}/categories`);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Guides",
    workspace_id: "w1",
    parent_category_id: "c0",
    category_type: "folder",
    hidden: false,
  });
  assertEquals(out.id, "c1");
});

Deno.test("category-create: a vendor error surfaces its code and message", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    headers: PROBLEM_HEADERS,
    body: problem(422, "VALIDATION_ERROR", "The field is required.", "title"),
  }]);
  let message = "";
  try {
    await categoryCreate.execute({
      workspaceId: "w1",
      name: "Guides",
      parentCategoryId: "c0",
      categoryType: "folder",
      hidden: false,
    }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("VALIDATION_ERROR"), true, message);
  assertEquals(message.includes("title: The field is required."), true, message);
});
