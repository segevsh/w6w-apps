import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { CalendlyClient, uuidOf } from "../../lib/client.ts";

Deno.test("client: 204 returns undefined without parsing a body", async () => {
  const { ctx } = mockCtx([{ status: 204, headers: {} }]);
  const client = new CalendlyClient(ctx);
  const result = await client.request("/webhook_subscriptions/abc", { method: "DELETE" });
  assertEquals(result, undefined);
});

Deno.test("client: throws a descriptive Error on non-2xx", async () => {
  const { ctx } = mockCtx([
    { status: 404, statusText: "Not Found", body: '{"message":"Resource Not Found"}' },
  ]);
  const client = new CalendlyClient(ctx);
  const err = await assertRejects(
    () => client.request("/scheduled_events/missing"),
    Error,
    "Calendly 404",
  );
  assertEquals(err.message.includes("/scheduled_events/missing"), true);
});

Deno.test("client: skips null/undefined/empty query params", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const client = new CalendlyClient(ctx);
  await client.request("/event_types", {
    query: { user: "kept", organization: undefined, active: null, count: "" },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("user"), "kept");
  assertEquals(url.searchParams.has("organization"), false);
  assertEquals(url.searchParams.has("active"), false);
  assertEquals(url.searchParams.has("count"), false);
});

Deno.test("client: JSON body sets content-type and serializes", async () => {
  const { ctx, calls } = mockCtx([{ body: { resource: {} } }]);
  const client = new CalendlyClient(ctx);
  await client.request("/scheduling_links", {
    method: "POST",
    body: { max_event_count: 1, owner: "u", owner_type: "EventType" },
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(
    JSON.parse(calls[0].body!),
    { max_event_count: 1, owner: "u", owner_type: "EventType" },
  );
});

Deno.test("client: passes an absolute URL through unchanged", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const client = new CalendlyClient(ctx);
  await client.request("https://api.calendly.com/users/AAAA");
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.calendly.com");
  assertEquals(url.pathname, "/users/AAAA");
});

Deno.test("client: never sets Authorization (sign does)", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new CalendlyClient(ctx).request("/users/me");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("uuidOf: extracts the last path segment of a URI", () => {
  assertEquals(uuidOf("https://api.calendly.com/users/AAAA"), "AAAA");
  assertEquals(uuidOf("https://api.calendly.com/scheduled_events/DDDD/"), "DDDD");
  assertEquals(uuidOf("EEEE"), "EEEE");
});
