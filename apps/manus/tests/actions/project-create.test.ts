import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import projectCreate from "../../actions/project-create.ts";
import { mockCtx, okBody, pathOf } from "../_helpers.ts";

test("project-create: posts name and instruction, returns the project unwrapped", async () => {
  const { ctx, calls } = mockCtx([{
    body: okBody({ project: { id: "p1", name: "Acme", created_at: 1 } }),
  }]);
  const out = await projectCreate.execute({ name: "Acme", instruction: "Be formal" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/project.create");
  assertEquals(JSON.parse(calls[0].body!), { name: "Acme", instruction: "Be formal" });
  assertEquals(out, { id: "p1", name: "Acme", created_at: 1 });
});

test("project-create: omits instruction when not set", async () => {
  const { ctx, calls } = mockCtx([{
    body: okBody({ project: { id: "p1", name: "Acme", created_at: 1 } }),
  }]);
  await projectCreate.execute({ name: "Acme" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { name: "Acme" });
});

test("project-create: is not idempotent — no uniqueness constraint on name", () => {
  assertEquals(projectCreate.idempotent, false);
});
