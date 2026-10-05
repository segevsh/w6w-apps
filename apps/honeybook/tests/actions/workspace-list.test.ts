import { assertEquals, assertRejects } from "@std/assert";
import workspaceList from "../../actions/workspace-list.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = {
  "page": 5,
  "perPage": 5,
  "projectId": "x-projectId",
  "status": "lead",
  "kind": "general",
  "archived": true,
  "createdAfter": "2026-10-05T10:00:00Z",
  "createdBefore": "2026-10-05T10:00:00Z",
  "sort": "-created_at",
};

Deno.test("workspace-list: sends GET /workspaces with the mapped fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "r1", marker: "m" } }]);
  const out = await workspaceList.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v3/workspaces");
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(queryOf(calls[0].url), {
    "page": "5",
    "per_page": "5",
    "project_id": "x-projectId",
    "status": "lead",
    "kind": "general",
    "archived": "true",
    "created_after": "2026-10-05T10:00:00Z",
    "created_before": "2026-10-05T10:00:00Z",
    "sort": "-created_at",
  });
  assertEquals(calls[0].body, null);
  assertEquals(out, { id: "r1", marker: "m" });
});

Deno.test("workspace-list: sends only what was supplied", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "r1", marker: "m" } }]);
  await workspaceList.execute({} as never, ctx);
  assertEquals(queryOf(calls[0].url), {});
});

Deno.test("workspace-list: surfaces the API error type and message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody("HBObjectNotFoundError", "not found") }]);
  await assertRejects(
    async () => await workspaceList.execute(INPUT, ctx),
    Error,
    "HBObjectNotFoundError",
  );
});
