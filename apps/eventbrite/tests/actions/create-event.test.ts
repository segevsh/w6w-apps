import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-event.ts";

Deno.test("create-event: POSTs wrapped event with nested name/start/end", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "1" } }]);
  await action.execute!(
    {
      organizationId: "org/1",
      name: "Party",
      summary: "fun",
      startUtc: "2026-12-01T18:00:00Z",
      endUtc: "2026-12-01T20:00:00Z",
      timezone: "America/Los_Angeles",
      currency: "USD",
      onlineEvent: true,
      isSeries: false,
      capacity: 50,
    },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v3/organizations/org%2F1/events/");
  assertEquals(JSON.parse(calls[0].body!), {
    event: {
      name: { html: "Party" },
      summary: "fun",
      start: { timezone: "America/Los_Angeles", utc: "2026-12-01T18:00:00Z" },
      end: { timezone: "America/Los_Angeles", utc: "2026-12-01T20:00:00Z" },
      currency: "USD",
      online_event: true,
      is_series: false,
      capacity: 50,
    },
  });
});

Deno.test("create-event: extra deep-merges into event", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    {
      organizationId: "o",
      name: "A",
      extra: { name: { text: "x" }, custom_field: 1 },
    },
    ctx,
  );
  const ev = JSON.parse(calls[0].body!).event;
  assertEquals(ev.name, { html: "A", text: "x" });
  assertEquals(ev.custom_field, 1);
  assert(!("start" in ev));
});
