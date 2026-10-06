import { assertEquals, assertRejects } from "@std/assert";
import eventCreate from "../../actions/event-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const base = {
  linkId: "link_1",
  displayName: "Jane",
  email: "jane@example.com",
  startAt: "2026-10-20T14:00:00Z",
  endAt: "2026-10-20T14:30:00Z",
  timeZone: "America/New_York",
};

Deno.test("event-create: POST /v1/links/{id}/events with snake_case body", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "event_9" } }]);
  const out = await eventCreate.execute({
    ...base,
    phoneNumber: "+15551234",
    fields: '[{"id":"f","label":"L","type":"text","value":"v"}]',
    metadata: { src: "w6w" },
  }, ctx) as { id: string };
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/links/link_1/events");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), {
    display_name: "Jane",
    email: "jane@example.com",
    start_at: "2026-10-20T14:00:00Z",
    end_at: "2026-10-20T14:30:00Z",
    time_zone: "America/New_York",
    phone_number: "+15551234",
    fields: [{ id: "f", label: "L", type: "text", value: "v" }],
    metadata: { src: "w6w" },
  });
  assertEquals(out.id, "event_9");
});

Deno.test("event-create: optional fields are omitted", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await eventCreate.execute(base, ctx);
  assertEquals(Object.keys(JSON.parse(calls[0].body!)).sort(), [
    "display_name",
    "email",
    "end_at",
    "start_at",
    "time_zone",
  ]);
});

Deno.test("event-create: bad fields JSON fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await eventCreate.execute({ ...base, fields: "{nope" }, ctx),
    Error,
    "fields",
  );
  assertEquals(calls.length, 0);
});

Deno.test("event-create: a 422 surfaces the vendor's error text", async () => {
  const { ctx } = mockCtx([{ status: 422, body: { errors: { start_at: ["not available"] } } }]);
  await assertRejects(async () => await eventCreate.execute(base, ctx), Error, "422");
});
