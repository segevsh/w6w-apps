import { assertEquals } from "@std/assert";
import action from "../../actions/list-activities.ts";
import { exec, mockCtx, page, pathOf, queryAll, queryOf } from "../_helpers.ts";

Deno.test("list-activities: GETs /v1/activity/{domainId} (singular) with the window", async () => {
  const body = page([{ id: "a1", type: "delivered" }]);
  const { ctx, calls } = mockCtx([{ body }]);
  const out = await exec(action, { domainId: "d/1", dateFrom: 100, dateTo: 200 }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/activity/d%2F1");
  assertEquals(queryOf(calls[0].url), { date_from: "100", date_to: "200" });
  assertEquals(out, body);
});

Deno.test("list-activities: event types are sent as event[]", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);
  await exec(action, {
    domainId: "d1",
    dateFrom: 1,
    dateTo: 2,
    event: ["hard_bounced", "soft_bounced"],
    page: 2,
    limit: 100,
  }, ctx);
  assertEquals(queryAll(calls[0].url, "event[]"), ["hard_bounced", "soft_bounced"]);
  assertEquals(queryOf(calls[0].url).page, "2");
});

Deno.test("list-activities: the event options are exactly the documented types", () => {
  const options = action.params!.find((p) => p.key === "event")!.options as { value: string }[];
  assertEquals(options.length, 15);
  assertEquals(options.some((o) => o.value === "suppressed"), true);
});
