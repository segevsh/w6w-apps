import { assertEquals, assertRejects } from "@std/assert";
import projectCreate from "../../actions/project-create.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("project-create: POST /projects with the documented query and body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { "id": 1, "name": "x" } }]);
  const out = await projectCreate.execute({
    "name": "Website",
    "type": "board",
    "users": "1304,1543",
  }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/projects");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "name": "Website",
    "type": "board",
    "users": [1304, 1543],
  });
  assertEquals(calls[0].headers["x-accept-version"], "1.2");
  assertEquals(
    calls[0].headers["x-api-key"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals(out, { "id": 1, "name": "x" });
});

Deno.test("project-create: an Everhour error surfaces its message and status", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody(404, "Not found") }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        projectCreate.execute({ "name": "Website", "type": "board", "users": "1304,1543" }, ctx),
      ),
    Error,
  );
  assertEquals(err.message.includes("404"), true, err.message);
  assertEquals(err.message.includes("Not found"), true, err.message);
});

Deno.test("project-create: declares perform and idempotent=false", () => {
  assertEquals(projectCreate.type, "perform");
  assertEquals(projectCreate.idempotent, false);
});
