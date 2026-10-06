import { assertEquals, assertRejects } from "@std/assert";
import projectList from "../../actions/project-list.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "status": "active" };
const RESPONSE = {
  "request_id": "r",
  "results": [{
    "id": "22222222-2222-4222-8222-222222222222",
    "title": "Launch",
    "description": "d",
    "status": "active",
    "last_activity_at": "2026-01-31T09:00:00Z",
    "created_at": "2026-01-31T09:00:00Z",
    "updated_at": "2026-01-31T09:00:00Z",
  }],
  "total": 1,
  "next_page": null,
};

Deno.test("project-list: GET /v2/projects", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: RESPONSE }]);
  const out = await projectList.execute(INPUT, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/projects");
  assertEquals(queryOf(calls[0].url), { "status": "active" });
  assertEquals(jsonBody(calls[0]), null);
  assertEquals(calls[0].url.startsWith("https://api.mem.ai/"), true);
  assertEquals((out.items as unknown[]).length, 1);
  assertEquals(out.total, 1);
  assertEquals(out.hasMore, false);
});

Deno.test("project-list: puts no credential on the request (sign owns that)", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: RESPONSE }]);
  await projectList.execute(INPUT, ctx);
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("project-list: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: {
      error_category: "CLIENT_ERROR",
      error_metadata: { error_kind: "NOT_FOUND", message: "no such thing" },
    },
  }]);
  const err = await assertRejects(() => Promise.resolve(projectList.execute(INPUT, ctx))) as Error;
  assertEquals(err.message.includes("(404)"), true);
  assertEquals(err.message.includes("no such thing"), true);
});
