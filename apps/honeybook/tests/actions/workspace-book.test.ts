import { assertEquals, assertRejects } from "@std/assert";
import workspaceBook from "../../actions/workspace-book.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = {
  "workspaceId": "x-workspaceId",
  "include": ["creator", "pipeline_stage"],
  "maxActionSuggestions": 5,
  "maxScheduledSessions": 5,
};

Deno.test("workspace-book: sends POST /workspaces/{id}/book with the mapped fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "r1", marker: "m" } }]);
  const out = await workspaceBook.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v3/workspaces/x-workspaceId/book");
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(JSON.parse(calls[0].body!), {
    "include": ["creator", "pipeline_stage"],
    "max_action_suggestions": 5,
    "max_scheduled_sessions": 5,
  });
  assertEquals(out, { id: "r1", marker: "m" });
});

Deno.test("workspace-book: sends only what was supplied", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "r1", marker: "m" } }]);
  await workspaceBook.execute({ "workspaceId": "x-workspaceId" } as never, ctx);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
});

Deno.test("workspace-book: percent-encodes path ids", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "r1", marker: "m" } }]);
  await workspaceBook.execute({ ...INPUT, ...{ "workspaceId": "a/b" } }, ctx);
  const segs = pathOf(calls[0].url).split("/");
  assertEquals(segs.includes("a%2Fb"), true);
});

Deno.test("workspace-book: surfaces the API error type and message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody("HBObjectNotFoundError", "not found") }]);
  await assertRejects(
    async () => await workspaceBook.execute(INPUT, ctx),
    Error,
    "HBObjectNotFoundError",
  );
});
