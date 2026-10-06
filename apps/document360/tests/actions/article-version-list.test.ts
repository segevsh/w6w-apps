import { assertEquals } from "@std/assert";
import articleVersionList from "../../actions/article-version-list.ts";
import {
  listEnvelope,
  mockCtx,
  pathOf,
  PID,
  problem,
  PROBLEM_HEADERS,
  queryOf,
} from "../_helpers.ts";

Deno.test("article-version-list: lists versions", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: listEnvelope([{ version_number: 1 }, { version_number: 2 }]),
  }]);
  const out = await articleVersionList.execute({ articleId: "a1", langCode: "en" }, ctx) as {
    items: unknown[];
  };

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), `/v3/projects/${PID}/articles/a1/versions`);
  assertEquals(queryOf(calls[0].url), { lang_code: "en" });
  assertEquals(calls[0].body, null);
  assertEquals(out.items.length, 2);
});

Deno.test("article-version-list: a vendor error surfaces its code and message", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    headers: PROBLEM_HEADERS,
    body: problem(422, "VALIDATION_ERROR", "The field is required.", "title"),
  }]);
  let message = "";
  try {
    await articleVersionList.execute({ articleId: "a1", langCode: "en" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("VALIDATION_ERROR"), true, message);
  assertEquals(message.includes("title: The field is required."), true, message);
});
