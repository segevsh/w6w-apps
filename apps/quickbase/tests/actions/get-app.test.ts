import { assertEquals, assertThrows } from "@std/assert";
import { mockQbCtx } from "../_helpers.ts";
import action from "../../actions/get-app.ts";

Deno.test("get-app: reads the connection's default application", async () => {
  const { ctx, calls } = mockQbCtx([{ body: { id: "bqrapp1", name: "Ops" } }]);
  const out = await action.execute({}, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/v1/apps/bqrapp1");
  assertEquals(out.name, "Ops");
});

Deno.test("get-app: returns application variables and the public-exposure flag", async () => {
  const { ctx } = mockQbCtx([{
    body: {
      id: "bqrapp1",
      variables: [{ name: "env", value: "prod" }],
      hasEveryoneOnTheInternet: false,
      securityProperties: { allowExport: true },
    },
  }]);
  const out = await action.execute({}, ctx);

  assertEquals(out.variables, [{ name: "env", value: "prod" }]);
  assertEquals(out.hasEveryoneOnTheInternet, false);
  assertEquals(out.securityProperties!.allowExport, true);
});

Deno.test("get-app: an explicit appId overrides the connection default", async () => {
  const { ctx, calls } = mockQbCtx([{ body: {} }]);
  await action.execute({ appId: "bqrother" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/apps/bqrother");
});

Deno.test("get-app: errors when no app id is resolvable", () => {
  const { ctx } = mockQbCtx([], { realm: "acme.quickbase.com" });
  assertThrows(() => action.execute({}, ctx), Error);
});
