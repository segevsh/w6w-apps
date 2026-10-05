import { assertEquals, assertRejects } from "@std/assert";
import workspaceExists from "../../actions/workspace-exists.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = {};

Deno.test("workspace-exists: sends GET /workspaces/any with the mapped fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "r1", marker: "m" } }]);
  const out = await workspaceExists.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v3/workspaces/any");
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
  assertEquals(out, { id: "r1", marker: "m" });
});

Deno.test("workspace-exists: sends only what was supplied", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "r1", marker: "m" } }]);
  await workspaceExists.execute({} as never, ctx);
  assertEquals(queryOf(calls[0].url), {});
});

Deno.test("workspace-exists: surfaces the API error type and message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody("HBObjectNotFoundError", "not found") }]);
  await assertRejects(
    async () => await workspaceExists.execute(INPUT, ctx),
    Error,
    "HBObjectNotFoundError",
  );
});
