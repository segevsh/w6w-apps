import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import oauth2 from "../../auth/oauth2.ts";

Deno.test("oauth2.sign: stamps the bearer header and never calls the network", async () => {
  const request = { url: "https://webexapis.com/v1/rooms", headers: {} as Record<string, string> };
  const out = await oauth2.sign!(
    { request, credential: { accessToken: "tok123" } } as never,
    {} as never,
  );
  assertEquals(out.headers["authorization"], "Bearer tok123");
});

Deno.test("oauth2.test: reports ok without a network call when the credential is empty", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await oauth2.test!({ credential: {} } as never, ctx);
  assertEquals(result, { ok: false, message: "credential missing accessToken" });
  assertEquals(calls.length, 0);
});

Deno.test("oauth2.test: ok on a live GET /people/me", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "p1" } }]);
  const result = await oauth2.test!({ credential: { accessToken: "tok123" } } as never, ctx);
  assertEquals(result, { ok: true });
  assertEquals(calls[0].url, "https://webexapis.com/v1/people/me");
  assertEquals(calls[0].headers["authorization"], "Bearer tok123");
});

Deno.test("oauth2.test: classifies a 401 from the response body, not the status alone", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: {
      message: "The request requires a valid access token.",
      errors: [{ description: "The request requires a valid access token." }],
      trackingId: "ROUTERGW_1",
    },
  }]);
  const result = await oauth2.test!({ credential: { accessToken: "bad" } } as never, ctx);
  assertEquals(result.ok, false);
  assertEquals(result.message, "The request requires a valid access token.");
  // The credential itself must never appear in the message.
  assertEquals(result.message?.includes("bad"), false);
});

Deno.test("oauth2.test: falls back to a generic message for an unexpected status", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "oops" }]);
  const result = await oauth2.test!({ credential: { accessToken: "tok" } } as never, ctx);
  assertEquals(result.ok, false);
  assertEquals(result.message, "Webex returned HTTP 500 for GET /people/me");
});

Deno.test("oauth2.afterConnect: publishes email and display name", async () => {
  const { ctx } = mockCtx([{
    body: { id: "p1", emails: ["jo@acme.test"], displayName: "Jo Example" },
  }]);
  const result = await oauth2.afterConnect!({ credential: { accessToken: "tok" } } as never, ctx);
  assertEquals(result, { user: { id: "p1", email: "jo@acme.test", name: "Jo Example" } });
});

Deno.test("oauth2.afterConnect: is silent on failure", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "oops" }]);
  const result = await oauth2.afterConnect!({ credential: { accessToken: "tok" } } as never, ctx);
  assertEquals(result, {});
});

Deno.test("oauth2: declares the authorize/token URLs on webexapis.com", () => {
  assertEquals(oauth2.oauth2?.authorizationUrl, "https://webexapis.com/v1/authorize");
  assertEquals(oauth2.oauth2?.tokenUrl, "https://webexapis.com/v1/access_token");
  assertEquals(oauth2.oauth2?.refreshUrl, "https://webexapis.com/v1/access_token");
});
