import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  compact,
  formatWebexError,
  stripWebhookSecret,
  toList,
  unset,
  WebexClient,
} from "../../lib/client.ts";

Deno.test("compact: drops undefined, null and empty-string keys", () => {
  assertEquals(compact({ a: 1, b: undefined, c: null, d: "", e: false, f: 0 }), {
    a: 1,
    e: false,
    f: 0,
  });
});

Deno.test("unset: treats a blank string as absent", () => {
  assertEquals(unset(""), undefined);
  assertEquals(unset("x"), "x");
  assertEquals(unset(undefined), undefined);
});

Deno.test("toList: splits and trims a comma-separated field", () => {
  assertEquals(toList("a, b ,c"), ["a", "b", "c"]);
  assertEquals(toList(""), undefined);
  assertEquals(toList(undefined), undefined);
});

Deno.test("stripWebhookSecret: removes the secret field only", () => {
  const stripped = stripWebhookSecret<{ id: string; secret?: string; name: string }>({
    id: "1",
    secret: "shh",
    name: "hook",
  });
  assertEquals(stripped, { id: "1", name: "hook" });
});

Deno.test("stripWebhookSecret: passes through a non-object unchanged", () => {
  assertEquals(stripWebhookSecret(null), null);
  assertEquals(stripWebhookSecret(undefined), undefined);
});

Deno.test("formatWebexError: surfaces message, errors[].description and trackingId", () => {
  const msg = formatWebexError(
    401,
    "GET",
    "/people/me",
    JSON.stringify({
      message: "The request requires a valid access token.",
      errors: [{ description: "The request requires a valid access token." }],
      trackingId: "ROUTERGW_abc123",
    }),
  );
  assertEquals(
    msg,
    "Webex 401 for GET /people/me: The request requires a valid access token. — " +
      "trackingId=ROUTERGW_abc123",
  );
});

Deno.test("formatWebexError: falls back to the raw body when it isn't the documented shape", () => {
  const msg = formatWebexError(500, "GET", "/rooms", "<html>oops</html>");
  assertEquals(msg, "Webex 500 for GET /rooms: <html>oops</html>");
});

Deno.test("WebexClient.request: GET builds the URL and query string", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  await new WebexClient(ctx).request("/rooms", { query: { max: 10, type: "group" } });
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://webexapis.com/v1/rooms?max=10&type=group");
});

Deno.test("WebexClient.request: drops unset query values", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new WebexClient(ctx).request("/rooms", { query: { teamId: undefined, max: 5 } });
  assertEquals(calls[0].url, "https://webexapis.com/v1/rooms?max=5");
});

Deno.test("WebexClient.request: POST sends a compacted JSON body", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "1" } }]);
  await new WebexClient(ctx).request("/rooms", {
    method: "POST",
    body: { title: "x", description: undefined },
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { title: "x" });
});

Deno.test("WebexClient.request: 204 resolves to undefined", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  const result = await new WebexClient(ctx).request("/rooms/1", { method: "DELETE" });
  assertEquals(result, undefined);
});

Deno.test("WebexClient.request: throws a formatted error on a non-2xx response", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: {
      message: "Not found.",
      errors: [{ description: "Not found." }],
      trackingId: "ROUTERGW_xyz",
    },
  }]);
  await assertRejects(
    () => new WebexClient(ctx).request("/rooms/missing"),
    Error,
    "Webex 404 for GET /v1/rooms/missing: Not found.",
  );
});
