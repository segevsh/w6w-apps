import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-groups.ts";
import { NETWORK_PLACEHOLDER } from "../../lib/client.ts";

test("list-groups: GETs the network's groups", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "g1", networkId: "n1", name: "Investors" }] }]);
  const out = await action.execute({}, ctx);
  assertEquals(calls[0].url, `https://api.folk.app/network/${NETWORK_PLACEHOLDER}/groups`);
  assertEquals(out, { groups: [{ id: "g1", networkId: "n1", name: "Investors" }] });
});
