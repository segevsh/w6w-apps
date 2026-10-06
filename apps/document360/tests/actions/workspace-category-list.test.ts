import { assertEquals } from "@std/assert";
import workspaceCategoryList from "../../actions/workspace-category-list.ts";
import {
  listEnvelope,
  mockCtx,
  pathOf,
  PID,
  problem,
  PROBLEM_HEADERS,
  queryOf,
} from "../_helpers.ts";

Deno.test("workspace-category-list: passes language and archived flags", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: listEnvelope([{ id: "c1", child_categories: [] }]),
  }]);
  const out = await workspaceCategoryList.execute({
    workspaceId: "w1",
    langCode: "fr",
    includeArchived: true,
  }, ctx) as { items: unknown[] };

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), `/v3/projects/${PID}/workspaces/w1/categories`);
  assertEquals(queryOf(calls[0].url), { lang_code: "fr", include_archived: "true" });
  assertEquals(calls[0].body, null);
  assertEquals(out.items.length, 1);
});

Deno.test("workspace-category-list: a vendor error surfaces its code and message", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    headers: PROBLEM_HEADERS,
    body: problem(422, "VALIDATION_ERROR", "The field is required.", "title"),
  }]);
  let message = "";
  try {
    await workspaceCategoryList.execute({
      workspaceId: "w1",
      langCode: "fr",
      includeArchived: true,
    }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("VALIDATION_ERROR"), true, message);
  assertEquals(message.includes("title: The field is required."), true, message);
});
