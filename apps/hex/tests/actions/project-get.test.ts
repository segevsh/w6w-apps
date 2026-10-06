import { assertEquals, assertRejects } from "@std/assert";
import projectGet from "../../actions/project-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("project-get: GET /api/v1/projects/{id} returns the body unwrapped", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "p1", title: "Revenue" } }]);
  const out = await projectGet.execute({ projectId: "p1" }, ctx) as { title: string };
  assertEquals(pathOf(calls[0].url), "/api/v1/projects/p1");
  assertEquals(out.title, "Revenue");
});

Deno.test("project-get: include flags are forwarded", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await projectGet.execute({ projectId: "p1", includeSharing: true, includeUnlisted: true }, ctx);
  assertEquals(queryOf(calls[0].url), { includeSharing: "true", includeUnlisted: "true" });
});

Deno.test("project-get: an id cannot escape its path segment", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await projectGet.execute({ projectId: "a/../users" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v1/projects/a%2F..%2Fusers");
});

Deno.test("project-get: a plain-text 401 from the edge is reported with its status", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    headers: { "content-type": "text/plain" },
    body: "Unauthorized",
  }]);
  const err = await assertRejects(
    () => Promise.resolve(projectGet.execute({ projectId: "p" }, ctx)),
    Error,
  );
  assertEquals(
    err.message.includes("401") && err.message.includes("Unauthorized"),
    true,
    err.message,
  );
});
