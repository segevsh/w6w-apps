import { assertEquals, assertRejects } from "@std/assert";
import projectDateCreate from "../../actions/project-date-create.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "projectId": "x-projectId" };

Deno.test("project-date-create: sends POST /projects/{id}/dates with the mapped fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "r1", marker: "m" } }]);
  const out = await projectDateCreate.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v3/projects/x-projectId/dates");
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
  assertEquals(out, { id: "r1", marker: "m" });
});

Deno.test("project-date-create: sends only what was supplied", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "r1", marker: "m" } }]);
  await projectDateCreate.execute({ "projectId": "x-projectId" } as never, ctx);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
});

Deno.test("project-date-create: percent-encodes path ids", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "r1", marker: "m" } }]);
  await projectDateCreate.execute({ ...INPUT, ...{ "projectId": "a/b" } }, ctx);
  const segs = pathOf(calls[0].url).split("/");
  assertEquals(segs.includes("a%2Fb"), true);
});

Deno.test("project-date-create: surfaces the API error type and message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody("HBObjectNotFoundError", "not found") }]);
  await assertRejects(
    async () => await projectDateCreate.execute(INPUT, ctx),
    Error,
    "HBObjectNotFoundError",
  );
});
