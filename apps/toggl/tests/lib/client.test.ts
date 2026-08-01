import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { API_URL, CREATED_WITH, TogglClient, toTogglTime } from "../../lib/client.ts";

Deno.test("client: builds the request against API_URL and drops empty query values", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  const client = new TogglClient(ctx);
  await client.request("/me/time_entries", { query: { since: 1, before: undefined } });
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.track.toggl.com");
  assertEquals(url.pathname, "/api/v9/me/time_entries");
  assertEquals(url.searchParams.get("since"), "1");
  assertEquals(url.searchParams.has("before"), false);
  assertEquals(API_URL, "https://api.track.toggl.com/api/v9");
});

Deno.test("client: never sets Authorization itself", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const client = new TogglClient(ctx);
  await client.request("/me");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("client: JSON-encodes the body and sets content-type", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }]);
  const client = new TogglClient(ctx);
  await client.request("/workspaces/1/time_entries", { method: "POST", body: { name: "x" } });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { name: "x" });
});

Deno.test("client: a 204 response resolves to undefined", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  const client = new TogglClient(ctx);
  const result = await client.request("/workspaces/1/time_entries/1", { method: "DELETE" });
  assertEquals(result, undefined);
});

Deno.test("client: a 200 with an empty body resolves to undefined", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "" }]);
  const client = new TogglClient(ctx);
  const result = await client.request("/workspaces/1/time_entries/1", { method: "DELETE" });
  assertEquals(result, undefined);
});

Deno.test("client: a non-ok response throws with status and body detail", async () => {
  const { ctx } = mockCtx([{ status: 403, body: "Invalid credentials" }]);
  const client = new TogglClient(ctx);
  await assertRejects(
    () => client.request("/me"),
    Error,
    "Toggl 403",
  );
});

Deno.test("toTogglTime: formats without milliseconds, UTC, trailing Z", () => {
  const d = new Date("2026-07-01T12:34:56.789Z");
  assertEquals(toTogglTime(d), "2026-07-01T12:34:56Z");
});

Deno.test("CREATED_WITH: identifies this integration", () => {
  assertEquals(CREATED_WITH, "w6w");
});
