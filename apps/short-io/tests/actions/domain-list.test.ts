import { assertEquals } from "@std/assert";
import action from "../../actions/domain-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("domain-list: GETs /api/domains and unwraps the bare array", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 7, hostname: "go.example.com" }] }]);
  const out = await action.execute({ pattern: "go" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/domains");
  assertEquals(queryOf(calls[0].url), { limit: "100", pattern: "go" });
  assertEquals(out.domains[0].hostname, "go.example.com");
});

Deno.test("domain-list: a non-array body yields an empty list", async () => {
  const { ctx } = mockCtx([{ body: {} }]);
  assertEquals((await action.execute({}, ctx)).domains, []);
});
