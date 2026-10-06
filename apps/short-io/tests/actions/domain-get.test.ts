import { assertEquals } from "@std/assert";
import action from "../../actions/domain-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("domain-get: GETs /domains/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 7, hostname: "go.example.com" } }]);
  const out = await action.execute({ domainId: 7 }, ctx);
  assertEquals(pathOf(calls[0].url), "/domains/7");
  assertEquals(out.hostname, "go.example.com");
});
