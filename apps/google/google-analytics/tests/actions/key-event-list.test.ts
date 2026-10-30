import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/key-event-list.ts";

/** keyEvents, not the deprecated conversionEvents name for the same list. */
test("key-event-list: reads the current keyEvents resource", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { keyEvents: [{ eventName: "purchase" }] },
  }], {
    display: { propertyId: "123" },
  });
  const result = await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1beta/properties/123/keyEvents");
  assertEquals(result, [{ eventName: "purchase" }]);
});
