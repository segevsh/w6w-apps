import { assertEquals, assertRejects } from "@std/assert";
import projectSpaceAdd from "../../actions/project-space-add.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "projectId": "x-projectId", "spaceId": "x-spaceId" };

Deno.test("project-space-add: sends PUT /projects/{id}/spaces/{space_id} with the mapped fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "r1", marker: "m" } }]);
  const out = await projectSpaceAdd.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/api/v3/projects/x-projectId/spaces/x-spaceId");
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
  assertEquals(out, { id: "r1", marker: "m" });
});

Deno.test("project-space-add: sends only what was supplied", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "r1", marker: "m" } }]);
  await projectSpaceAdd.execute(
    { "projectId": "x-projectId", "spaceId": "x-spaceId" } as never,
    ctx,
  );
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
});

Deno.test("project-space-add: percent-encodes path ids", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "r1", marker: "m" } }]);
  await projectSpaceAdd.execute({ ...INPUT, ...{ "projectId": "a/b", "spaceId": "a/b" } }, ctx);
  const segs = pathOf(calls[0].url).split("/");
  assertEquals(segs.includes("a%2Fb"), true);
});

Deno.test("project-space-add: surfaces the API error type and message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody("HBObjectNotFoundError", "not found") }]);
  await assertRejects(
    async () => await projectSpaceAdd.execute(INPUT, ctx),
    Error,
    "HBObjectNotFoundError",
  );
});
