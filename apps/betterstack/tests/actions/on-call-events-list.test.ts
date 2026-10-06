import { assertEquals, assertRejects } from "@std/assert";
import onCallEventsList from "../../actions/on-call-events-list.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("on-call-events-list: GET /api/v2/on-calls/{schedule_id}/events", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "events": [{
        "id": 1,
        "users": ["a@example.com"],
        "starts_at": "2026-10-01T00:00:00Z",
        "ends_at": "2026-10-02T00:00:00Z",
        "override": false,
      }],
    },
  }]);
  const out = await onCallEventsList.execute({
    "schedule_id": "12345",
    "starts_at": "2026-10-01T00:00:00Z",
  }, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v2/on-calls/12345/events");
  assertEquals(queryOf(calls[0].url), { "starts_at": "2026-10-01T00:00:00Z" });
  assertEquals(jsonBody(calls[0]), null);
  assertEquals(calls[0].url.startsWith("https://uptime.betterstack.com/"), true);
  assertEquals(out.count, 1);
});

Deno.test("on-call-events-list: puts no credential on the request (sign owns that)", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "events": [{
        "id": 1,
        "users": ["a@example.com"],
        "starts_at": "2026-10-01T00:00:00Z",
        "ends_at": "2026-10-02T00:00:00Z",
        "override": false,
      }],
    },
  }]);
  await onCallEventsList.execute(
    { "schedule_id": "12345", "starts_at": "2026-10-01T00:00:00Z" },
    ctx,
  );
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("on-call-events-list: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { errors: "Invalid Team API token." } }]);
  const err = await assertRejects(async () =>
    await onCallEventsList.execute(
      { "schedule_id": "12345", "starts_at": "2026-10-01T00:00:00Z" },
      ctx,
    )
  ) as Error;
  assertEquals(err.message.includes("(401)"), true);
  assertEquals(err.message.includes("Invalid Team API token."), true);
});
