import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/event-list.ts";

const events = ok({
  data: [
    { value: "Checkout Completed" },
    { value: "Old Event", non_active: true },
    { value: "Removed Event", deleted: true },
  ],
});

Deno.test("event-list: returns the taxonomy with hidden and deleted counted", async () => {
  const { ctx, calls } = mockCtx([events], { display });
  const result = await action.execute!({}, ctx) as {
    count: number;
    hidden: number;
    deleted: number;
  };
  assertEquals(new URL(calls[0].url).pathname, "/api/2/events/list");
  assertEquals(result.count, 3);
  assertEquals(result.hidden, 1);
  assertEquals(result.deleted, 1);
});

/** The only way to notice a chart's event was quietly tidied away. */
Deno.test("event-list: inactive events can be filtered out, and are still counted", async () => {
  const { ctx } = mockCtx([events], { display });
  const result = await action.execute!({ includeInactive: false }, ctx) as {
    count: number;
    hidden: number;
    names: string[];
  };
  assertEquals(result.count, 1);
  assertEquals(result.hidden, 1, "still reported, so the filtering is visible");
  assertEquals(result.names, ["Checkout Completed"]);
});

/** The endpoint has answered both bare and wrapped over its life. */
Deno.test("event-list: a bare array works as well as a wrapped one", async () => {
  const { ctx } = mockCtx([ok([{ value: "A" }, { value: "B" }])], { display });
  const result = await action.execute!({}, ctx) as { count: number };
  assertEquals(result.count, 2);
});

Deno.test("event-list: an empty taxonomy is a count of zero", async () => {
  const { ctx } = mockCtx([ok({ data: [] })], { display });
  const result = await action.execute!({}, ctx) as { count: number };
  assertEquals(result.count, 0);
});

Deno.test("event-list: says hidden events keep collecting", () => {
  assert(
    /Hidden and deleted events are still listed/.test(action.description!),
    action.description,
  );
});
