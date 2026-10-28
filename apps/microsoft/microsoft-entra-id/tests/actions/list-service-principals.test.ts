import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-service-principals.ts";

Deno.test("list-service-principals: GETs /servicePrincipals", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [{ id: "s1" }] } }]);
  const out = await action.execute({ filter: "appId eq 'x'" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1.0/servicePrincipals");
  assertEquals(url.searchParams.get("$filter"), "appId eq 'x'");
  assertEquals(out.value.length, 1);
});

Deno.test("list-service-principals: page size is capped at the documented 100", () => {
  const top = action.params!.find((p) => p.key === "top")!;
  assertEquals(top.validation?.max, 100);
  assertEquals(top.default, 100);
});

Deno.test("list-service-principals: advancedQuery sends ConsistencyLevel", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({
    orderby: "displayName",
    filter: "accountEnabled eq true",
    advancedQuery: true,
  }, ctx);
  assertEquals(calls[0].headers.consistencylevel, "eventual");
  assert(calls[0].url.includes("servicePrincipals"));
});
