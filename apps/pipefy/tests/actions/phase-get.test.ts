import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx, normalizeGql } from "../_helpers.ts";
import phaseGet from "../../actions/phase-get.ts";

test("phase-get: fetches a phase with its fields", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { phase: { id: "1", name: "New", fields: [{ id: "f1", label: "Name" }] } } },
  }]);
  const out = await phaseGet.execute({ id: "1" }, ctx) as { name: string };
  assertEquals(out.name, "New");
  const q = normalizeGql(JSON.parse(calls[0].body!).query);
  assert(q.startsWith("{ phase(id: 1) {"));
  assert(q.includes("fields { id label }"));
});

test("phase-get: type/resource metadata", () => {
  assertEquals(phaseGet.type, "read");
  assertEquals(phaseGet.resource, "phase");
});
