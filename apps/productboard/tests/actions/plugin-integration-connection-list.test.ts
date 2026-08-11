import { assertEquals } from "@std/assert";
import action from "../../actions/plugin-integration-connection-list.ts";
import { listEnvelope, mockCtx, pathOf, queryAll } from "../_helpers.ts";

Deno.test("plugin-integration-connection-list: GETs the connections sub-path", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ entityId: "e-1" }]) }]);
  const out = await action.execute({ integrationId: "p-1" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/plugin-integrations/p-1/connections");
  assertEquals(out.items.length, 1);
});

/** `state[]=error` is the "which links are broken" query. */
Deno.test("plugin-integration-connection-list: states become repeated state[] keys", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await action.execute({ integrationId: "p-1", states: ["error", "progress"] }, ctx);
  assertEquals(queryAll(calls[0].url, "state[]"), ["error", "progress"]);
});

Deno.test("plugin-integration-connection-list: offers exactly the four documented states", () => {
  const p = action.params?.find((p) => p.key === "states");
  assertEquals(
    (p?.options as Array<{ value: string }>).map((o) => o.value),
    ["connected", "error", "progress", "initial"],
  );
});
