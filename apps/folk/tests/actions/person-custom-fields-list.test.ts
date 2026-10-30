import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/person-custom-fields-list.ts";
import { NETWORK_PLACEHOLDER } from "../../lib/client.ts";

test("person-custom-fields-list: GETs the group's person custom fields", async () => {
  const { ctx, calls } = mockCtx([{
    body: [{
      id: "cf1",
      groupId: "g1",
      contactType: "person",
      name: "Role",
      type: "singleSelect",
      values: [{ id: "v1", label: "Investor" }],
    }],
  }]);
  const out = await action.execute({ groupId: "g1" }, ctx) as {
    customFields: Array<{ name: string }>;
  };
  assertEquals(
    calls[0].url,
    `https://api.folk.app/network/${NETWORK_PLACEHOLDER}/group/g1/person/custom-fields`,
  );
  assertEquals(out.customFields[0].name, "Role");
});
