import { assertEquals, assertRejects } from "@std/assert";
import pipelineList from "../../actions/pipeline-list.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = {
  "page": 5,
  "perPage": 5,
  "stageIds": ["a1", "b2"],
  "userIds": ["a1", "b2"],
  "viewId": "x-viewId",
  "group": "opportunities",
  "category": "lead",
  "tagIds": ["a1", "b2"],
  "projectTypeIds": ["a1", "b2"],
  "leadSourceIds": ["a1", "b2"],
  "archived": true,
  "untracked": true,
  "hasSuggestion": true,
  "sort": "-name",
};

Deno.test("pipeline-list: sends GET /pipeline with the mapped fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "r1", marker: "m" } }]);
  const out = await pipelineList.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v3/pipeline");
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(queryOf(calls[0].url), {
    "page": "5",
    "per_page": "5",
    "stage_ids": "a1,b2",
    "user_ids": "a1,b2",
    "view_id": "x-viewId",
    "group": "opportunities",
    "category": "lead",
    "tag_ids": "a1,b2",
    "project_type_ids": "a1,b2",
    "lead_source_ids": "a1,b2",
    "archived": "true",
    "untracked": "true",
    "has_suggestion": "true",
    "sort": "-name",
  });
  assertEquals(calls[0].body, null);
  assertEquals(out, { id: "r1", marker: "m" });
});

Deno.test("pipeline-list: sends only what was supplied", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "r1", marker: "m" } }]);
  await pipelineList.execute({} as never, ctx);
  assertEquals(queryOf(calls[0].url), {});
});

Deno.test("pipeline-list: surfaces the API error type and message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody("HBObjectNotFoundError", "not found") }]);
  await assertRejects(
    async () => await pipelineList.execute(INPUT, ctx),
    Error,
    "HBObjectNotFoundError",
  );
});
