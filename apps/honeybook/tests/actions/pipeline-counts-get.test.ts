import { assertEquals, assertRejects } from "@std/assert";
import pipelineCountsGet from "../../actions/pipeline-counts-get.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = {
  "userIds": ["a1", "b2"],
  "viewId": "x-viewId",
  "group": "opportunities",
  "category": "lead",
  "tagIds": ["a1", "b2"],
  "projectTypeIds": ["a1", "b2"],
  "leadSourceIds": ["a1", "b2"],
};

Deno.test("pipeline-counts-get: sends GET /pipeline/counts with the mapped fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "r1", marker: "m" } }]);
  const out = await pipelineCountsGet.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v3/pipeline/counts");
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(queryOf(calls[0].url), {
    "user_ids": "a1,b2",
    "view_id": "x-viewId",
    "group": "opportunities",
    "category": "lead",
    "tag_ids": "a1,b2",
    "project_type_ids": "a1,b2",
    "lead_source_ids": "a1,b2",
  });
  assertEquals(calls[0].body, null);
  assertEquals(out, { id: "r1", marker: "m" });
});

Deno.test("pipeline-counts-get: sends only what was supplied", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "r1", marker: "m" } }]);
  await pipelineCountsGet.execute({} as never, ctx);
  assertEquals(queryOf(calls[0].url), {});
});

Deno.test("pipeline-counts-get: surfaces the API error type and message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody("HBObjectNotFoundError", "not found") }]);
  await assertRejects(
    async () => await pipelineCountsGet.execute(INPUT, ctx),
    Error,
    "HBObjectNotFoundError",
  );
});
