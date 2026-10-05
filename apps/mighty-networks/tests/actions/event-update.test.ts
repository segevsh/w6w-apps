import { assert, assertEquals, assertRejects } from "@std/assert";
import { API, bodyOf, mockConnectedCtx, mockCtx, NET } from "../_helpers.ts";
import action from "../../actions/event-update.ts";

const INPUT = {
  "id": 7,
  "title": "Town hall",
  "description": "Monthly",
  "startsAt": "2026-11-01T17:00:00Z",
  "endsAt": "2026-11-01T18:00:00Z",
  "eventType": "online_meeting",
  "link": "https://example.com/live",
  "location": "Berlin",
  "timeZone": "Europe/Berlin",
  "rsvpEnabled": true,
  "rsvpClosed": false,
  "restrictedEvent": false,
  "postInFeed": true,
  "frequency": "weekly",
  "interval": 2,
  "recurrenceCount": 5,
  "recurUntil": "2027-01-01T00:00:00Z",
};

Deno.test("event-update: PATCH /events/{id}/ on the connected Network", async () => {
  const { ctx, calls } = mockConnectedCtx([{ body: { id: 1 } }]);
  await action.execute(INPUT as never, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, `${API}/networks/${NET}/events/7/`);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(url.search, "");
  const body = bodyOf(calls[0]);
  assertEquals(body, {
    "title": "Town hall",
    "description": "Monthly",
    "starts_at": "2026-11-01T17:00:00Z",
    "ends_at": "2026-11-01T18:00:00Z",
    "event_type": "online_meeting",
    "link": "https://example.com/live",
    "location": "Berlin",
    "time_zone": "Europe/Berlin",
    "rsvp_enabled": true,
    "rsvp_closed": false,
    "restricted_event": false,
    "post_in_feed": true,
    "frequency": "weekly",
    "interval": 2,
    "recurrence_count": 5,
    "recur_until": "2027-01-01T00:00:00Z",
  });
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("event-update: returns the API body", async () => {
  const { ctx } = mockConnectedCtx([{ body: { id: 42, marker: "x" } }]);
  assertEquals(await action.execute(INPUT as never, ctx), { id: 42, marker: "x" });
});

Deno.test("event-update: optional body fields that are unset are not sent", async () => {
  const { ctx, calls } = mockConnectedCtx([{ body: { id: 1 } }]);
  await action.execute({ "id": 7 } as never, ctx);
  assertEquals(calls[0].body, "{}");
});

Deno.test("event-update: declares what it needs and what it returns", () => {
  assertEquals(action.type, "perform");
  assertEquals((action.params ?? []).filter((p) => p.required).map((p) => p.key), ["id"]);
  assertEquals(action.idempotent, true);
  assert(Array.isArray(action.output) && action.output.length > 0);
});

Deno.test("event-update: refuses to run on a connection with no Network ID", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await assertRejects(async () => await action.execute(INPUT as never, ctx), Error, "Network ID");
  assertEquals(calls.length, 0);
});

Deno.test("event-update: surfaces the vendor error with status and path", async () => {
  const { ctx } = mockConnectedCtx([{
    status: 403,
    statusText: "Forbidden",
    body: { error: "forbidden", message: "Not allowed" },
  }]);
  await assertRejects(async () => await action.execute(INPUT as never, ctx), Error, "403");
});
