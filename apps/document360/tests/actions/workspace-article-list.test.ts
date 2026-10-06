import { assertEquals } from "@std/assert";
import workspaceArticleList from "../../actions/workspace-article-list.ts";
import {
  listEnvelope,
  mockCtx,
  pathOf,
  PID,
  problem,
  PROBLEM_HEADERS,
  queryOf,
} from "../_helpers.ts";

Deno.test("workspace-article-list: lists article summaries", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: listEnvelope([{ id: "a1", status: "draft" }]),
  }]);
  const out = await workspaceArticleList.execute({ workspaceId: "w1", pageSize: 50 }, ctx) as {
    items: unknown[];
  };

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), `/v3/projects/${PID}/workspaces/w1/articles`);
  assertEquals(queryOf(calls[0].url), { page_size: "50" });
  assertEquals(calls[0].body, null);
  assertEquals(out.items[0], { id: "a1", status: "draft" });
});

Deno.test("workspace-article-list: a vendor error surfaces its code and message", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    headers: PROBLEM_HEADERS,
    body: problem(422, "VALIDATION_ERROR", "The field is required.", "title"),
  }]);
  let message = "";
  try {
    await workspaceArticleList.execute({ workspaceId: "w1", pageSize: 50 }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("VALIDATION_ERROR"), true, message);
  assertEquals(message.includes("title: The field is required."), true, message);
});
