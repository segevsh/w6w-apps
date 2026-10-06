import { assertEquals, assertRejects } from "@std/assert";
import projectRestore from "../../actions/project-restore.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("project-restore: PATCH /projects/{id}/restore sends no body and flattens the answer", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "data": { "id": "42", "type": "projects", "attributes": { "name": "x" } } },
  }]);
  const out = await projectRestore.execute({ id: "42" }, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/api/v2/projects/42/restore");
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers["x-auth-token"], undefined, "credentials belong to sign");
  assertEquals(out.id, "42");
});

Deno.test("project-restore: a vendor error surfaces its status, title and detail", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: errorBody("404", "not_found", "Not Found", "Resource not found"),
  }]);
  const err = await assertRejects(
    () => Promise.resolve(projectRestore.execute({ id: "42" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("404"), true, err.message);
  assertEquals(err.message.includes("Resource not found"), true, err.message);
});

Deno.test("project-restore: declares perform and idempotent=true", () => {
  assertEquals(projectRestore.type, "perform");
  assertEquals(projectRestore.idempotent, true);
  assertEquals(projectRestore.key, "project-restore");
});
