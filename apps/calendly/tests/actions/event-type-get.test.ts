import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/event-type-get.ts";

test("event-type-get: addresses /event_types/{uuid} from a URI", async () => {
  const { ctx, calls } = mockCtx([{ body: { resource: {} } }]);
  await action.execute({ eventType: "https://api.calendly.com/event_types/CCCC" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/event_types/CCCC");
  assertEquals(calls[0].method, "GET");
});
