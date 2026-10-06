import { assertEquals, assertRejects } from "@std/assert";
import projectArchive from "../../actions/project-archive.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("project-archive: PATCH /projects/{projectId}/archive with the documented query and body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { "id": 1, "name": "x" } }]);
  const out = await projectArchive.execute({ "projectId": "ev:1", "archived": true }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/projects/ev:1/archive");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), { "archived": true });
  assertEquals(calls[0].headers["x-accept-version"], "1.2");
  assertEquals(
    calls[0].headers["x-api-key"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals(out, { "id": 1, "name": "x" });
});

Deno.test("project-archive: an Everhour error surfaces its message and status", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody(404, "Not found") }]);
  const err = await assertRejects(
    () => Promise.resolve(projectArchive.execute({ "projectId": "ev:1", "archived": true }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("404"), true, err.message);
  assertEquals(err.message.includes("Not found"), true, err.message);
});

Deno.test("project-archive: declares perform and idempotent=true", () => {
  assertEquals(projectArchive.type, "perform");
  assertEquals(projectArchive.idempotent, true);
});
