import { assert, assertEquals } from "@std/assert";
import { mockCtx, param } from "../_helpers.ts";
import searchAppointments from "../../actions/search-appointments.ts";

Deno.test("search-appointments: GETs /appointments with a paired window", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { _metadata: { collection: "appointments" }, appointments: [] },
  }]);
  await searchAppointments.execute({
    personId: 44673,
    start: "2026-05-10T00:00:00Z",
    end: "2026-05-11T00:00:00Z",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/appointments");
  assertEquals(url.searchParams.get("start"), "2026-05-10T00:00:00Z");
  assertEquals(url.searchParams.get("end"), "2026-05-11T00:00:00Z");
});

/**
 * This endpoint returns far less than people expect, for three documented
 * reasons. An empty result is usually scoping, not an empty calendar — and if
 * that stops being said, every integrator rediscovers it as a bug report.
 */

/**
 * This endpoint returns far less than people expect, for three documented
 * reasons. An empty result is usually scoping, not an empty calendar — and if
 * that stops being said, every integrator rediscovers it as a bug report.
 */
Deno.test("search-appointments: explains the three visibility conditions", () => {
  const d = searchAppointments.description!;
  assert(/authenticating user/i.test(d), d);
  assert(/Google|Outlook|synced/i.test(d), d);
  assert(param(searchAppointments, "start").hint?.includes("Must be paired"));
});
