import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx, mockHighLevelCtx } from "../_helpers.ts";
import { API_VERSION, HighLevelClient, locationIdFromConnection } from "../../lib/client.ts";

Deno.test("HighLevelClient: GET sets the default Version header", async () => {
  const { ctx, calls } = mockHighLevelCtx([{ body: { ok: true } }]);
  const client = new HighLevelClient(ctx);
  await client.request("/contacts/1");
  assertEquals(calls[0].headers["version"], API_VERSION);
});

Deno.test("HighLevelClient: a request-level version override wins", async () => {
  const { ctx, calls } = mockHighLevelCtx([{ body: {} }]);
  const client = new HighLevelClient(ctx);
  await client.request("/calendars/", { version: "2021-04-15" });
  assertEquals(calls[0].headers["version"], "2021-04-15");
});

Deno.test("HighLevelClient: POST sends a JSON body with content-type", async () => {
  const { ctx, calls } = mockHighLevelCtx([{ status: 201, body: { id: "c1" } }]);
  const client = new HighLevelClient(ctx);
  await client.request("/contacts/", { method: "POST", body: { firstName: "Ada" } });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { firstName: "Ada" });
});

Deno.test("HighLevelClient: drops undefined/null/empty query values", async () => {
  const { ctx, calls } = mockHighLevelCtx([{ body: {} }]);
  const client = new HighLevelClient(ctx);
  await client.request("/contacts/", {
    query: { limit: 20, after: undefined, query: "", ok: "yes" },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("limit"), "20");
  assertEquals(url.searchParams.has("after"), false);
  assertEquals(url.searchParams.has("query"), false);
  assertEquals(url.searchParams.get("ok"), "yes");
});

Deno.test("HighLevelClient: a non-ok response throws with the parsed message", async () => {
  const { ctx } = mockHighLevelCtx([
    { status: 422, body: { message: "locationId must be a valid HighLevel location" } },
  ]);
  const client = new HighLevelClient(ctx);
  await assertRejects(
    () => client.request("/contacts/", { method: "POST", body: {} }),
    Error,
    "locationId must be a valid HighLevel location",
  );
});

Deno.test("HighLevelClient: a 204/empty response resolves to undefined", async () => {
  const { ctx } = mockHighLevelCtx([{ status: 204, body: undefined }]);
  const client = new HighLevelClient(ctx);
  const out = await client.request("/contacts/1", { method: "DELETE" });
  assertEquals(out, undefined);
});

Deno.test("locationIdFromConnection: reads display.locationId", () => {
  const { ctx } = mockHighLevelCtx([], "loc-42");
  assertEquals(locationIdFromConnection(ctx.connection), "loc-42");
});

Deno.test("locationIdFromConnection: throws when the connection has none", () => {
  const { ctx } = mockCtx([]);
  let threw = false;
  try {
    locationIdFromConnection(ctx.connection);
  } catch {
    threw = true;
  }
  assertEquals(threw, true);
});
