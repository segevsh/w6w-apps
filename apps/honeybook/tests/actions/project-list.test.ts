import { assertEquals, assertRejects } from "@std/assert";
import projectList from "../../actions/project-list.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = {
  "page": 5,
  "perPage": 5,
  "include": ["workspaces", "custom_fields"],
  "maxWorkspaces": 5,
  "maxCustomFields": 5,
  "nameContains": "x-nameContains",
  "projectTypeId": "x-projectTypeId",
  "projectAfter": "2026-10-05",
  "projectBefore": "2026-10-05",
  "createdAfter": "2026-10-05T10:00:00Z",
  "createdBefore": "2026-10-05T10:00:00Z",
  "sort": "-created_at",
};

Deno.test("project-list: sends GET /projects with the mapped fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "r1", marker: "m" } }]);
  const out = await projectList.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v3/projects");
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(queryOf(calls[0].url), {
    "page": "5",
    "per_page": "5",
    "include": "workspaces,custom_fields",
    "max_workspaces": "5",
    "max_custom_fields": "5",
    "name_contains": "x-nameContains",
    "project_type_id": "x-projectTypeId",
    "project_after": "2026-10-05",
    "project_before": "2026-10-05",
    "created_after": "2026-10-05T10:00:00Z",
    "created_before": "2026-10-05T10:00:00Z",
    "sort": "-created_at",
  });
  assertEquals(calls[0].body, null);
  assertEquals(out, { id: "r1", marker: "m" });
});

Deno.test("project-list: sends only what was supplied", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "r1", marker: "m" } }]);
  await projectList.execute({} as never, ctx);
  assertEquals(queryOf(calls[0].url), {});
});

Deno.test("project-list: surfaces the API error type and message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody("HBObjectNotFoundError", "not found") }]);
  await assertRejects(
    async () => await projectList.execute(INPUT, ctx),
    Error,
    "HBObjectNotFoundError",
  );
});
