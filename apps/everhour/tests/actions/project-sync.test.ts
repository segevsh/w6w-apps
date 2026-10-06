import { assertEquals, assertRejects } from "@std/assert";
import projectSync from "../../actions/project-sync.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("project-sync: POST /projects/{projectId}/sync with the documented query and body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { "id": 1, "name": "x" } }]);
  const out = await projectSync.execute({ "projectId": "as:1234567789001" }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/projects/as:1234567789001/sync");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(calls[0].headers["x-accept-version"], "1.2");
  assertEquals(
    calls[0].headers["x-api-key"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals(out, { "id": 1, "name": "x" });
});

Deno.test("project-sync: an Everhour error surfaces its message and status", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody(404, "Not found") }]);
  const err = await assertRejects(
    () => Promise.resolve(projectSync.execute({ "projectId": "as:1234567789001" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("404"), true, err.message);
  assertEquals(err.message.includes("Not found"), true, err.message);
});

Deno.test("project-sync: declares perform and idempotent=true", () => {
  assertEquals(projectSync.type, "perform");
  assertEquals(projectSync.idempotent, true);
});
