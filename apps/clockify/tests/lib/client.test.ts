import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { API_URL, ClockifyClient } from "../../lib/client.ts";

Deno.test("client: builds the request against API_URL and drops empty query values", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  const client = new ClockifyClient(ctx);
  await client.request("/workspaces/1/time-entries", {
    query: { page: 1, "page-size": undefined },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.clockify.me");
  assertEquals(url.pathname, "/api/v1/workspaces/1/time-entries");
  assertEquals(url.searchParams.get("page"), "1");
  assertEquals(url.searchParams.has("page-size"), false);
  assertEquals(API_URL, "https://api.clockify.me/api/v1");
});

Deno.test("client: never sets X-Api-Key itself", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const client = new ClockifyClient(ctx);
  await client.request("/workspaces");
  assertEquals(calls[0].headers["x-api-key"], undefined);
});

Deno.test("client: JSON-encodes the body and sets content-type", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }]);
  const client = new ClockifyClient(ctx);
  await client.request("/workspaces/1/projects", { method: "POST", body: { name: "x" } });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { name: "x" });
});

Deno.test("client: a 204 response resolves to undefined", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  const client = new ClockifyClient(ctx);
  const result = await client.request("/workspaces/1/time-entries/1", { method: "DELETE" });
  assertEquals(result, undefined);
});

Deno.test("client: a non-ok response throws with status and body detail", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "Invalid key" }]);
  const client = new ClockifyClient(ctx);
  await assertRejects(
    () => client.request("/workspaces"),
    Error,
    "Clockify 401",
  );
});
