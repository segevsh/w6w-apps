import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/schedule-campaign.ts";

Deno.test("schedule-campaign: POSTs /api/campaigns/{id}/schedule", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "1", status: "sent" } } }]);
  await action.execute!({ campaignId: "1", delivery: "instant" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/campaigns/1/schedule");
});

Deno.test("schedule-campaign: an instant send carries delivery only, no schedule object", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await action.execute!({ campaignId: "1", delivery: "instant" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { delivery: "instant" });
});

Deno.test("schedule-campaign: nests the bracketed schedule fields into a `schedule` object", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await action.execute!({
    campaignId: "1",
    delivery: "scheduled",
    date: "2038-01-19",
    hours: "09",
    minutes: "30",
    timezoneId: 4,
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    delivery: "scheduled",
    schedule: { date: "2038-01-19", hours: "09", minutes: "30", timezone_id: 4 },
  });
});

Deno.test("schedule-campaign: a timezone_based send needs no date", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await action.execute!(
    { campaignId: "1", delivery: "timezone_based", hours: "09", minutes: "00" },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), {
    delivery: "timezone_based",
    schedule: { hours: "09", minutes: "00" },
  });
});

Deno.test("schedule-campaign: is NOT idempotent — re-running an instant send sends again", () => {
  assertEquals(action.idempotent, false);
});

Deno.test("schedule-campaign: the delivery options match the documented vocabulary", () => {
  const options = action.params!.find((p) => p.key === "delivery")!.options as Array<
    { value: string }
  >;
  assertEquals(options.map((o) => o.value), [
    "instant",
    "scheduled",
    "timezone_based",
    "smart_sending",
  ]);
});
