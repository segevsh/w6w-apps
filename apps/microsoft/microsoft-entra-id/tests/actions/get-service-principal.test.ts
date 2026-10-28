import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-service-principal.ts";

Deno.test("get-service-principal: GETs /servicePrincipals/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "s1", appId: "c1" } }]);
  const out = await action.execute({ servicePrincipalId: "s1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/servicePrincipals/s1");
  assertEquals(out.id, "s1");
});

Deno.test("get-service-principal: addresses by appId with the documented form", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ servicePrincipalId: "c1", idType: "appId" }, ctx);
  assertEquals(
    decodeURIComponent(new URL(calls[0].url).pathname),
    "/v1.0/servicePrincipals(appId='c1')",
  );
});

Deno.test("get-service-principal: requires an id", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute({ servicePrincipalId: " " }, ctx),
    Error,
    "required",
  );
  assertEquals(calls.length, 0);
});
