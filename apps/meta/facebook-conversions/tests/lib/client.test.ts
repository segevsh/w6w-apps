import { assert, assertEquals, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  API_URL,
  API_VERSION,
  asJsonValue,
  ConversionsClient,
  datasetFromConnection,
} from "../../lib/client.ts";

Deno.test("client: is pinned to the documented Graph API version", () => {
  assertEquals(API_VERSION, "v25.0");
  assertEquals(API_URL, "https://graph.facebook.com/v25.0");
});

Deno.test("client: builds a GET with query params, dropping empties", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  await new ConversionsClient(ctx).request("/123", {
    params: { fields: "id,name", after: undefined, q: "" },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v25.0/123");
  assertEquals(url.searchParams.get("fields"), "id,name");
  assertEquals(url.searchParams.get("after"), null);
  assertEquals(url.searchParams.get("q"), null);
});

Deno.test("client: sends a POST body as JSON", async () => {
  const { ctx, calls } = mockCtx([{ body: { events_received: 1 } }]);
  await new ConversionsClient(ctx).request("/123/events", {
    method: "POST",
    body: { data: [] },
  });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, '{"data":[]}');
});

Deno.test("client: never stamps a credential — not as a header, not in the URL", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new ConversionsClient(ctx).request("/me");
  assert(!("authorization" in calls[0].headers));
  assertEquals(new URL(calls[0].url).searchParams.get("access_token"), null);
});

Deno.test("client: raises Meta's error message, preferring the user-facing one", async () => {
  const { ctx } = mockCtx([
    {
      status: 400,
      body: {
        error: { message: "Invalid parameter", error_user_msg: "Your dataset ID is wrong" },
      },
    },
  ]);
  const err = await new ConversionsClient(ctx).request("/1/events", { method: "POST", body: {} })
    .then(() => null, (e: Error) => e);
  assert(err instanceof Error);
  assertEquals(err.message.includes("Your dataset ID is wrong"), true);
  assertEquals(err.message.includes("400"), true);
});

Deno.test("client: falls back to the raw body when the error is not JSON", async () => {
  const { ctx } = mockCtx([{ status: 502, body: "<html>bad gateway</html>" }]);
  const err = await new ConversionsClient(ctx).request("/me").then(() => null, (e: Error) => e);
  assert(err instanceof Error);
  assertEquals(err.message.includes("bad gateway"), true);
});

Deno.test("datasetFromConnection: prefers the explicit override", () => {
  const { ctx } = mockCtx();
  assertEquals(datasetFromConnection(ctx.connection, "999"), "999");
  assertEquals(datasetFromConnection(ctx.connection, "  "), "1234567890");
});

Deno.test("datasetFromConnection: falls back to the connection's stored dataset", () => {
  const { ctx } = mockCtx([], { dataset: { id: "77" } });
  assertEquals(datasetFromConnection(ctx.connection), "77");
});

Deno.test("datasetFromConnection: explains what to do when there is no dataset anywhere", () => {
  const { ctx } = mockCtx([], { dataset: null, auth: "oauth2" });
  assertThrows(
    () => datasetFromConnection(ctx.connection),
    Error,
    "No dataset (pixel) id",
  );
  assertThrows(() => datasetFromConnection(undefined), Error, "No dataset (pixel) id");
});

Deno.test("asJsonValue: passes objects through and parses strings", () => {
  assertEquals(asJsonValue({ a: 1 }, "X"), { a: 1 });
  assertEquals(asJsonValue('{"a":1}', "X"), { a: 1 });
  assertEquals(asJsonValue(undefined, "X"), undefined);
  assertThrows(() => asJsonValue("{nope", "Custom Data"), Error, "Custom Data is not valid JSON");
});
