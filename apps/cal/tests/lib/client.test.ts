import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { CalClient } from "../../lib/client.ts";

Deno.test("client: 204 returns undefined without parsing a body", async () => {
  const { ctx } = mockCtx([{ status: 204, headers: {} }]);
  const client = new CalClient(ctx);
  const result = await client.request("/bookings/abc/cancel", { method: "POST" });
  assertEquals(result, undefined);
});

Deno.test("client: throws a descriptive Error on non-2xx", async () => {
  const { ctx } = mockCtx([
    { status: 404, statusText: "Not Found", body: '{"error":{"message":"not found"}}' },
  ]);
  const client = new CalClient(ctx);
  const err = await assertRejects(
    () => client.request("/bookings/missing"),
    Error,
    "Cal.com 404",
  );
  assertEquals(err.message.includes("/v2/bookings/missing"), true);
});

Deno.test("client: skips null/undefined/empty query params", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  const client = new CalClient(ctx);
  await client.request("/bookings", {
    query: { status: "upcoming", attendeeEmail: undefined, eventTypeId: null, cursor: "" },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("status"), "upcoming");
  assertEquals(url.searchParams.has("attendeeEmail"), false);
  assertEquals(url.searchParams.has("eventTypeId"), false);
  assertEquals(url.searchParams.has("cursor"), false);
});

Deno.test("client: joins array query params with a comma", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  const client = new CalClient(ctx);
  await client.request("/event-types", { query: { usernames: ["alice", "bob"] } });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("usernames"), "alice,bob");
});

Deno.test("client: JSON body sets content-type and serializes", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  const client = new CalClient(ctx);
  await client.request("/bookings", {
    method: "POST",
    body: { eventTypeId: 1, start: "2026-08-01T09:00:00Z" },
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(
    JSON.parse(calls[0].body!),
    { eventTypeId: 1, start: "2026-08-01T09:00:00Z" },
  );
});

Deno.test("client: passes an absolute URL through unchanged", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  const client = new CalClient(ctx);
  await client.request("https://api.cal.com/v2/bookings/abc");
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.cal.com");
  assertEquals(url.pathname, "/v2/bookings/abc");
});

Deno.test("client: never sets Authorization (sign does)", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await new CalClient(ctx).request("/me");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("client: forwards custom headers such as cal-api-version", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await new CalClient(ctx).request("/event-types", {
    headers: { "cal-api-version": "2024-06-14" },
  });
  assertEquals(calls[0].headers["cal-api-version"], "2024-06-14");
});
