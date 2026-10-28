import { assertEquals } from "@std/assert";
import type { SignableRequest } from "@w6w/types";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/oauth2.ts";

Deno.test("oauth2: declares Meta's endpoints at the pinned API version", () => {
  assertEquals(auth.key, "oauth2");
  assertEquals(auth.type, "oauth2");
  assertEquals(auth.oauth2?.authorizationUrl, "https://www.facebook.com/v25.0/dialog/oauth");
  assertEquals(auth.oauth2?.tokenUrl, "https://graph.facebook.com/v25.0/oauth/access_token");
});

Deno.test("oauth2: requests only the scopes this app's surface needs", () => {
  assertEquals(auth.oauth2?.scopes, ["ads_management", "ads_read"]);
  assertEquals(auth.fields, undefined);
});

Deno.test("oauth2: sign stamps the bearer credential", () => {
  const request: SignableRequest = {
    url: "https://graph.facebook.com/v25.0/1/events",
    method: "POST",
    headers: {},
  };
  const signed = auth.sign!(
    { request, credential: { accessToken: "tok-1" } },
    mockCtx().ctx,
  ) as SignableRequest;
  assertEquals(signed.headers["authorization"], "Bearer tok-1");
});

Deno.test("oauth2: test probes /me", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "u1" } }]);
  assertEquals(await auth.test({ credential: { accessToken: "tok-1" } }, ctx), { ok: true });
  assertEquals(new URL(calls[0].url).pathname, "/v25.0/me");
});

Deno.test("oauth2: test fails without a credential and without a call", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals(await auth.test({ credential: {} }, ctx), {
    ok: false,
    message: "credential missing accessToken",
  });
  assertEquals(calls.length, 0);
});

Deno.test("oauth2: test reports a rejected token", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { error: { message: "bad token" } } }]);
  assertEquals(await auth.test({ credential: { accessToken: "nope" } }, ctx), {
    ok: false,
    message: "Meta returned 400",
  });
});

Deno.test("oauth2: afterConnect labels the connection with the user", async () => {
  const { ctx } = mockCtx([{ body: { id: "u1", name: "Ada" } }]);
  assertEquals(await auth.afterConnect!({ credential: {} }, ctx), {
    user: { id: "u1", name: "Ada" },
  });
});

Deno.test("oauth2: afterConnect degrades to no label rather than failing the connect", async () => {
  const { ctx } = mockCtx([{ status: 500 }]);
  assertEquals(await auth.afterConnect!({ credential: {} }, ctx), {});
});
