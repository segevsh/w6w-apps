import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/oauth2.ts";

Deno.test("oauth2: declares Jobber's own authorize and token endpoints", () => {
  assertEquals(auth.type, "oauth2");
  assertEquals(auth.oauth2?.authorizationUrl, "https://api.getjobber.com/api/oauth/authorize");
  assertEquals(auth.oauth2?.tokenUrl, "https://api.getjobber.com/api/oauth/token");
});

Deno.test("oauth2: PKCE is on — Jobber supports only S256", () => {
  assertEquals(auth.oauth2?.pkce, true);
});

Deno.test("oauth2: declares NO scopes, because Jobber's authorize URL takes no scope param", () => {
  // Scopes are configured on the app in Jobber's Developer Center. Declaring
  // them here would render a list in the connect UI that this app cannot
  // actually request.
  assertEquals(auth.oauth2?.scopes, undefined);
});

Deno.test("oauth2: collects no fields — nothing is typed in by hand", () => {
  assertEquals(auth.fields, undefined);
});

Deno.test("sign: attaches a Bearer token and touches nothing else", () => {
  const request = { headers: {} as Record<string, string> };
  const signed = auth.sign!(
    { request, credential: { accessToken: "tok_abc" } } as never,
    // deno-lint-ignore no-explicit-any
    undefined as any,
  ) as { headers: Record<string, string> };
  assertEquals(signed.headers["authorization"], "Bearer tok_abc");
  assertEquals(Object.keys(signed.headers), ["authorization"]);
});

Deno.test("test: a live credential passes", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { account: { id: "a1", name: "Acme" } } } }]);
  const res = await auth.test({ credential: { accessToken: "tok" } }, ctx);
  assertEquals(res, { ok: true });
  assertEquals(calls[0].url, "https://api.getjobber.com/api/graphql");
  assertEquals(calls[0].headers["x-jobber-graphql-version"], "2025-04-16");
});

Deno.test("test: HTTP 200 with an UNAUTHENTICATED error is NOT a live credential", async () => {
  // The exact body the live endpoint returns for an unauthenticated request.
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      errors: [{
        message:
          "The field account on an object of type Query was hidden because you are unauthenticated",
        extensions: { code: "UNAUTHENTICATED" },
      }],
      data: { account: null },
    },
  }]);
  const res = await auth.test({ credential: { accessToken: "tok" } }, ctx);
  assertEquals(res.ok, false);
  assert(res.message!.includes("unauthenticated"));
});

Deno.test("test: a 200 with a null account and no errors is still not live", async () => {
  const { ctx } = mockCtx([{ body: { data: { account: null } } }]);
  const res = await auth.test({ credential: { accessToken: "tok" } }, ctx);
  assertEquals(res.ok, false);
});

Deno.test("test: a 401 fails without pretending to know why", async () => {
  const { ctx } = mockCtx([{ status: 401, body: {} }]);
  const res = await auth.test({ credential: { accessToken: "tok" } }, ctx);
  assertEquals(res.ok, false);
  assert(res.message!.includes("401"));
});

Deno.test("test: a credential with no access token fails without a network call", async () => {
  const { ctx, calls } = mockCtx([]);
  const res = await auth.test({ credential: {} }, ctx);
  assertEquals(res, { ok: false, message: "credential missing accessToken" });
  assertEquals(calls.length, 0);
});

Deno.test("afterConnect: stores the account, which is what a disconnect webhook is matched on", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { account: { id: "a1", name: "Acme Plumbing" } } },
  }]);
  const out = await auth.afterConnect!({ credential: {} }, ctx) as { account: { name: string } };
  assertEquals(out.account.name, "Acme Plumbing");
  // Not signed by hand — the runtime routes this through `sign`.
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("afterConnect: degrades to an empty label rather than throwing", async () => {
  const { ctx } = mockCtx([{ body: { errors: [{ message: "nope" }], data: null } }]);
  assertEquals(await auth.afterConnect!({ credential: {} }, ctx), {});
});

Deno.test("connectionLabel: names the Jobber account, not a user", () => {
  assertEquals(auth.connectionLabel, "{{account.name}}");
});
