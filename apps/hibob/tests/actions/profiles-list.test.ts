import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import profilesList from "../../actions/profiles-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("profiles-list: GETs /v1/profiles", async () => {
  const { ctx, calls } = mockCtx([{ body: { employees: [{ id: "1" }] } }]);
  const out = await profilesList.execute({}, ctx) as { employees: unknown[] };
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/profiles");
  assertEquals(out.employees.length, 1);
});
