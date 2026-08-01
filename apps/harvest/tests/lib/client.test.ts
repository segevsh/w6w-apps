import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { API_URL, HarvestClient } from "../../lib/client.ts";

Deno.test("client: builds the request against API_URL and drops empty query values", async () => {
  const { ctx, calls } = mockCtx([{ body: { time_entries: [] } }]);
  const client = new HarvestClient(ctx);
  await client.request("/time_entries", { query: { project_id: "1", client_id: undefined } });
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.harvestapp.com");
  assertEquals(url.pathname, "/v2/time_entries");
  assertEquals(url.searchParams.get("project_id"), "1");
  assertEquals(url.searchParams.has("client_id"), false);
  assertEquals(API_URL, "https://api.harvestapp.com/v2");
});

Deno.test("client: never sets Authorization or Harvest-Account-Id itself", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const client = new HarvestClient(ctx);
  await client.request("/users/me");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].headers["harvest-account-id"], undefined);
});

Deno.test("client: JSON-encodes the body and sets content-type", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }]);
  const client = new HarvestClient(ctx);
  await client.request("/time_entries", { method: "POST", body: { project_id: "1" } });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { project_id: "1" });
});

Deno.test("client: a 204 response resolves to undefined", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  const client = new HarvestClient(ctx);
  const result = await client.request("/time_entries/1", { method: "DELETE" });
  assertEquals(result, undefined);
});

Deno.test("client: a 200 with an empty body resolves to undefined", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "" }]);
  const client = new HarvestClient(ctx);
  const result = await client.request("/time_entries/1", { method: "DELETE" });
  assertEquals(result, undefined);
});

Deno.test("client: a non-ok response throws with status and body detail", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { message: "Unauthorized" } }]);
  const client = new HarvestClient(ctx);
  await assertRejects(
    () => client.request("/users/me"),
    Error,
    "Harvest 401",
  );
});
