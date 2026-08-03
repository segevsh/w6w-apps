import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/property-list.ts";

Deno.test("property-list: narrows to a client and keeps `primary: false` as a value", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { properties: { nodes: [] } } } }]);
  await action.execute({ clientId: "c1", primaryOnly: false }, ctx);
  assertEquals(JSON.parse(calls[0].body!).variables, {
    filter: { clientId: "c1", primary: false },
    first: 25,
  });
});

Deno.test("property-list: an empty form sends no filter at all", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { properties: { nodes: [] } } } }]);
  await action.execute({}, ctx);
  assertEquals(JSON.parse(calls[0].body!).variables, { first: 25 });
});
