import { assert, assertEquals } from "@std/assert";
import { mockCtx, run } from "../_helpers.ts";
import searchEvents from "../../actions/search-events.ts";

Deno.test("search-events: joins a multiselect of types into one comma-separated param", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { _metadata: { collection: "events" }, events: [] },
  }]);
  await searchEvents.execute(
    { type: ["Registration", "Property Inquiry"] as unknown as string, personId: 12264 },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/events");
  assertEquals(url.searchParams.get("type"), "Registration,Property Inquiry");
  assertEquals(url.searchParams.get("personId"), "12264");
});

Deno.test("search-events: a single string type still works", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { events: [] } }]);
  await searchEvents.execute({ type: "Registration" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("type"), "Registration");
});

Deno.test("search-events: unwraps the envelope and carries the cursor", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      _metadata: { collection: "events", total: 1000, next: "eyJzaW5jZUlkIjoxMjYzMn0" },
      events: [{ id: 132 }],
    },
  }]);
  const result = await run<{ records: unknown[]; metadata: { next?: string } }>(
    searchEvents,
    {},
    ctx,
  );
  assertEquals(result.records.length, 1);
  assertEquals(result.metadata.next, "eyJzaW5jZUlkIjoxMjYzMn0");
});

/** Not an audit log — some events never reach the API at all. */

/** Not an audit log — some events never reach the API at all. */
Deno.test("search-events: says some events are UI-only", () => {
  assert(/only in the Follow Up Boss UI|visible only/i.test(searchEvents.description!));
});
