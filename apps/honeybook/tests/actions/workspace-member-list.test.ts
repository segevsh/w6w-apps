import { assertEquals, assertRejects } from "@std/assert";
import workspaceMemberList from "../../actions/workspace-member-list.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = {
  "workspaceId": "x-workspaceId",
  "page": 5,
  "perPage": 5,
  "include": ["user", "contact"],
};

Deno.test("workspace-member-list: sends GET /workspaces/{id}/members with the mapped fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "r1", marker: "m" } }]);
  const out = await workspaceMemberList.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v3/workspaces/x-workspaceId/members");
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(queryOf(calls[0].url), { "page": "5", "per_page": "5", "include": "user,contact" });
  assertEquals(calls[0].body, null);
  assertEquals(out, { id: "r1", marker: "m" });
});

Deno.test("workspace-member-list: sends only what was supplied", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "r1", marker: "m" } }]);
  await workspaceMemberList.execute({ "workspaceId": "x-workspaceId" } as never, ctx);
  assertEquals(queryOf(calls[0].url), {});
});

Deno.test("workspace-member-list: percent-encodes path ids", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "r1", marker: "m" } }]);
  await workspaceMemberList.execute({ ...INPUT, ...{ "workspaceId": "a/b" } }, ctx);
  const segs = pathOf(calls[0].url).split("/");
  assertEquals(segs.includes("a%2Fb"), true);
});

Deno.test("workspace-member-list: surfaces the API error type and message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody("HBObjectNotFoundError", "not found") }]);
  await assertRejects(
    async () => await workspaceMemberList.execute(INPUT, ctx),
    Error,
    "HBObjectNotFoundError",
  );
});
