import { assertEquals } from "@std/assert";
import workspaceSearch from "../../actions/workspace-search.ts";
import {
  listEnvelope,
  mockCtx,
  pathOf,
  PID,
  problem,
  PROBLEM_HEADERS,
  queryOf,
} from "../_helpers.ts";

Deno.test("workspace-search: sends the phrase as `query`", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: listEnvelope([{ article_id: "a1", title: "Keys" }]),
  }]);
  const out = await workspaceSearch.execute({
    workspaceId: "w1",
    query: "api key",
    langCode: "en",
    page: 2,
  }, ctx) as { items: unknown[] };

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), `/v3/projects/${PID}/workspaces/w1/search`);
  assertEquals(queryOf(calls[0].url), { query: "api key", lang_code: "en", page: "2" });
  assertEquals(calls[0].body, null);
  assertEquals(out.items.length, 1);
});

Deno.test("workspace-search: a vendor error surfaces its code and message", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    headers: PROBLEM_HEADERS,
    body: problem(422, "VALIDATION_ERROR", "The field is required.", "title"),
  }]);
  let message = "";
  try {
    await workspaceSearch.execute(
      { workspaceId: "w1", query: "api key", langCode: "en", page: 2 },
      ctx,
    );
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("VALIDATION_ERROR"), true, message);
  assertEquals(message.includes("title: The field is required."), true, message);
});
