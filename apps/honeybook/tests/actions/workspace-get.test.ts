import { assertEquals, assertRejects } from "@std/assert";
import workspaceGet from "../../actions/workspace-get.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = {
  "workspaceId": "x-workspaceId",
  "include": ["creator", "pipeline_stage"],
  "maxActionSuggestions": 5,
  "maxScheduledSessions": 5,
};

Deno.test("workspace-get: sends GET /workspaces/{id} with the mapped fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "r1", marker: "m" } }]);
  const out = await workspaceGet.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v3/workspaces/x-workspaceId");
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(queryOf(calls[0].url), {
    "include": "creator,pipeline_stage",
    "max_action_suggestions": "5",
    "max_scheduled_sessions": "5",
  });
  assertEquals(calls[0].body, null);
  assertEquals(out, { id: "r1", marker: "m" });
});

Deno.test("workspace-get: sends only what was supplied", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "r1", marker: "m" } }]);
  await workspaceGet.execute({ "workspaceId": "x-workspaceId" } as never, ctx);
  assertEquals(queryOf(calls[0].url), {});
});

Deno.test("workspace-get: percent-encodes path ids", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "r1", marker: "m" } }]);
  await workspaceGet.execute({ ...INPUT, ...{ "workspaceId": "a/b" } }, ctx);
  const segs = pathOf(calls[0].url).split("/");
  assertEquals(segs.includes("a%2Fb"), true);
});

Deno.test("workspace-get: surfaces the API error type and message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody("HBObjectNotFoundError", "not found") }]);
  await assertRejects(
    async () => await workspaceGet.execute(INPUT, ctx),
    Error,
    "HBObjectNotFoundError",
  );
});
