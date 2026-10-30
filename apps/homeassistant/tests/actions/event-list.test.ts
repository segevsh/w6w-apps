import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/event-list.ts";

const events = ok([
  { event: "state_changed", listener_count: 12 },
  { event: "delivery_arrived", listener_count: 0 },
  { event: "my_event", listener_count: 1 },
]);

test("event-list: returns the types with their listener counts", async () => {
  const { ctx, calls } = mockCtx([events], { display });
  const result = await action.execute!({}, ctx) as { count: number };
  assertEquals(calls[0].url, "https://abc.ui.nabu.casa/api/events");
  assertEquals(result.count, 3);
});

/**
 * The only way to find out before firing, since `event-fire` always reports
 * success regardless.
 */
test("event-list: names the types nothing is listening for", async () => {
  const { ctx } = mockCtx([events], { display });
  const result = await action.execute!({}, ctx) as { unlistened: string[] };
  assertEquals(result.unlistened, ["delivery_arrived"]);
});

test("event-list: an event with no count reads as unlistened", async () => {
  const { ctx } = mockCtx([ok([{ event: "x" }])], { display });
  const result = await action.execute!({}, ctx) as { unlistened: string[] };
  assertEquals(result.unlistened, ["x"]);
});

test("event-list: takes no parameters", () => {
  assertEquals(action.params?.length ?? 0, 0);
  assert(/before firing/.test(action.description!), action.description);
});
