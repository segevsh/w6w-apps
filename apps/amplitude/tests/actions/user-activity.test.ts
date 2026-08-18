import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/user-activity.ts";

const activity = ok({
  events: [
    { event_type: "Checkout Completed" },
    { event_type: "Page Viewed" },
    { event_type: "Page Viewed" },
  ],
  userData: { user_id: "user-1071", country: "GB" },
});

Deno.test("user-activity: fetches by the internal id and summarises the event types", async () => {
  const { ctx, calls } = mockCtx([activity], { display });
  const result = await action.execute!({ amplitudeId: "12345" }, ctx) as {
    count: number;
    eventTypes: string[];
  };
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/2/useractivity");
  assertEquals(url.searchParams.get("user"), "12345");
  assertEquals(result.count, 3);
  assertEquals(result.eventTypes, ["Checkout Completed", "Page Viewed"]);
});

/** A user_id here returns nothing rather than erroring, so it is caught first. */
Deno.test("user-activity: a non-numeric id is refused, and says which id to use", async () => {
  const { ctx, calls } = mockCtx([], { display });
  const error = await assertRejects(
    async () => await action.execute!({ amplitudeId: "user-1071" }, ctx),
    Error,
  );
  assert(/internal numeric id/.test(error.message), error.message);
  assert(/returns an empty result rather than an error/.test(error.message), error.message);
  assertEquals(calls.length, 0);
});

Deno.test("user-activity: the limit is clamped and the offset passed", async () => {
  const { ctx, calls } = mockCtx([activity], { display });
  await action.execute!({ amplitudeId: "12345", limit: 5000, offset: 20 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("limit"), "1000");
  assertEquals(url.searchParams.get("offset"), "20");
});

Deno.test("user-activity: the current user properties come back alongside", async () => {
  const { ctx } = mockCtx([activity], { display });
  const result = await action.execute!({ amplitudeId: "12345" }, ctx) as {
    userData: { country: string };
  };
  assertEquals(result.userData.country, "GB");
});

Deno.test("user-activity: needs an id", async () => {
  const { ctx } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({}, ctx),
    Error,
    "`amplitudeId` is required",
  );
});

/** The events are somebody's behaviour. */
Deno.test("user-activity: logs a count, never the events", async () => {
  const { ctx, logs } = mockCtx([activity], { display });
  await action.execute!({ amplitudeId: "12345" }, ctx);
  assert(!JSON.stringify(logs).includes("Checkout"), JSON.stringify(logs));
  assertEquals(logs[0].data, { count: 3 });
});

Deno.test("user-activity: says it is a window, not a history", () => {
  assert(/recent events/.test(action.description!), action.description);
});
