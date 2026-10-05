import { assertEquals, assertRejects } from "@std/assert";
import workspaceArchive from "../../actions/workspace-archive.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "workspaceId": "x-workspaceId", "reason": "x-reason" };

Deno.test("workspace-archive: sends POST /workspaces/{id}/archive with the mapped fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "r1", marker: "m" } }]);
  const out = await workspaceArchive.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v3/workspaces/x-workspaceId/archive");
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(JSON.parse(calls[0].body!), { "reason": "x-reason" });
  assertEquals(out, { id: "r1", marker: "m" });
});

Deno.test("workspace-archive: sends only what was supplied", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "r1", marker: "m" } }]);
  await workspaceArchive.execute({ "workspaceId": "x-workspaceId" } as never, ctx);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
});

Deno.test("workspace-archive: percent-encodes path ids", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "r1", marker: "m" } }]);
  await workspaceArchive.execute({ ...INPUT, ...{ "workspaceId": "a/b" } }, ctx);
  const segs = pathOf(calls[0].url).split("/");
  assertEquals(segs.includes("a%2Fb"), true);
});

Deno.test("workspace-archive: surfaces the API error type and message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody("HBObjectNotFoundError", "not found") }]);
  await assertRejects(
    async () => await workspaceArchive.execute(INPUT, ctx),
    Error,
    "HBObjectNotFoundError",
  );
});
