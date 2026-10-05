import { assertEquals, assertRejects } from "@std/assert";
import workspaceUpdate from "../../actions/workspace-update.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "workspaceId": "x-workspaceId", "name": "x-name" };

Deno.test("workspace-update: sends PATCH /workspaces/{id} with the mapped fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "r1", marker: "m" } }]);
  const out = await workspaceUpdate.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/api/v3/workspaces/x-workspaceId");
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(JSON.parse(calls[0].body!), { "name": "x-name" });
  assertEquals(out, { id: "r1", marker: "m" });
});

Deno.test("workspace-update: sends only what was supplied", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "r1", marker: "m" } }]);
  await workspaceUpdate.execute({ "workspaceId": "x-workspaceId" } as never, ctx);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
});

Deno.test("workspace-update: percent-encodes path ids", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "r1", marker: "m" } }]);
  await workspaceUpdate.execute({ ...INPUT, ...{ "workspaceId": "a/b" } }, ctx);
  const segs = pathOf(calls[0].url).split("/");
  assertEquals(segs.includes("a%2Fb"), true);
});

Deno.test("workspace-update: surfaces the API error type and message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody("HBObjectNotFoundError", "not found") }]);
  await assertRejects(
    async () => await workspaceUpdate.execute(INPUT, ctx),
    Error,
    "HBObjectNotFoundError",
  );
});
