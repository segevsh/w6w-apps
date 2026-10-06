import { assertEquals } from "@std/assert";
import profilesList from "../../actions/profiles-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("profiles-list: GETs /v1/profiles", async () => {
  const { ctx, calls } = mockCtx([{ body: { employees: [{ id: "1" }] } }]);
  const out = await profilesList.execute({}, ctx) as { employees: unknown[] };
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/profiles");
  assertEquals(out.employees.length, 1);
});
