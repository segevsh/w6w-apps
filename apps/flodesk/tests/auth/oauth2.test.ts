import { assert, assertEquals } from "@std/assert";
import auth from "../../auth/oauth2.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("oauth2: declares Flodesk's documented authorization-code endpoints", () => {
  assertEquals(auth.key, "oauth2");
  assertEquals(auth.type, "oauth2");
  assertEquals(auth.oauth2?.authorizationUrl, "https://api.flodesk.com/oauth2/authorize");
  assertEquals(auth.oauth2?.tokenUrl, "https://api.flodesk.com/oauth2/token");
  assertEquals(auth.oauth2?.refreshUrl, "https://api.flodesk.com/oauth2/token");
});

Deno.test("oauth2: declares the single documented scope, `all`", () => {
  assertEquals(auth.oauth2?.scopes, ["all"]);
});

Deno.test("oauth2: PKCE is explicitly OFF — the config default is true", () => {
  // Flodesk documents no code_challenge and authenticates the client with a
  // Basic client_id:client_secret pair. Omitting this would silently enable PKCE.
  assertEquals(auth.oauth2?.pkce, false);
});

Deno.test("oauth2: collects no fields — the host holds the client credentials", () => {
  assertEquals(auth.fields, undefined);
});

Deno.test("oauth2: sign stamps a Bearer token", () => {
  const request = {
    url: "https://api.flodesk.com/v1/segments",
    headers: {} as Record<string, string>,
  };
  const out = auth.sign!(
    { request, credential: { accessToken: "eyJraWQiOiJ0ZXN0" } } as never,
    undefined as never,
  ) as typeof request;
  assertEquals(out.headers["authorization"], "Bearer eyJraWQiOiJ0ZXN0");
});

Deno.test("oauth2: test probes the documented userinfo endpoint", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "a9c3", email: "foo@baz.com" } }]);
  const out = await auth.test!({ credential: { accessToken: "tok" } } as never, ctx);

  assertEquals(calls[0].url, "https://api.flodesk.com/oauth2/userinfo");
  assertEquals(calls[0].headers["authorization"], "Bearer tok");
  assertEquals(out.ok, true);
});

Deno.test("oauth2: test reports the status on a rejected token", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { code: "unauthorized" } }]);
  const out = await auth.test!({ credential: { accessToken: "bad" } } as never, ctx);
  assertEquals(out.ok, false);
  assert(out.message?.includes("401"));
});

Deno.test("oauth2: test fails fast with no token and makes no call", async () => {
  const { ctx, calls } = mockCtx([]);
  const out = await auth.test!({ credential: {} } as never, ctx);
  assertEquals(out.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("oauth2: afterConnect maps userinfo onto the label variables", async () => {
  const { ctx } = mockCtx([{
    body: {
      id: "a9c3f01e-6cc4-47c5-8710-e6d3c319888e",
      email: "foo@baz.com",
      full_name: "Foo Baz",
      profile_url: "https://example.com/logo.png",
      created_at: "2020-12-24T10:11:42.222Z",
    },
  }]);
  const out = await auth.afterConnect!({ credential: {} } as never, ctx) as {
    user: Record<string, unknown>;
  };

  assertEquals(out.user, {
    id: "a9c3f01e-6cc4-47c5-8710-e6d3c319888e",
    email: "foo@baz.com",
    fullName: "Foo Baz",
    profileUrl: "https://example.com/logo.png",
    createdAt: "2020-12-24T10:11:42.222Z",
  });
  // The connectionLabel template must only reference variables afterConnect sets.
  assertEquals(auth.connectionLabel, "{{user.fullName}} ({{user.email}})");
});

Deno.test("oauth2: afterConnect tolerates a failed lookup", async () => {
  const { ctx } = mockCtx([{ status: 500, body: {} }]);
  assertEquals(await auth.afterConnect!({ credential: {} } as never, ctx), {});
});

Deno.test("oauth2: declares no custom refresh hook — rotation is the host's job", () => {
  // Flodesk's refresh tokens are single-use and the exchange needs the
  // client_secret, which deliberately does not ship in this package.
  assertEquals(auth.refresh, undefined);
});
