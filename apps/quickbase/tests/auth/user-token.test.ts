import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/user-token.ts";
import type { SignableRequest } from "@w6w/types";

const credential = {
  realm: "acme.quickbase.com",
  userToken: "b1234567_abc_defghij",
  appId: "bqrapp1",
};

Deno.test("sign: emits `QB-USER-TOKEN <token>` — space form, no `user_token=`", () => {
  const request: SignableRequest = {
    url: "https://api.quickbase.com/v1/apps/bqrapp1",
    method: "GET",
    headers: {},
  };
  const signed = auth.sign!({ request, credential }, mockCtx().ctx) as SignableRequest;

  assertEquals(signed.headers["authorization"], "QB-USER-TOKEN b1234567_abc_defghij");
  // The `user_token=` form circulating in community posts is the legacy XML
  // API's parameter name and is rejected by the portal's own validator regex.
  assert(!signed.headers["authorization"].includes("user_token="));
  assert(!signed.headers["authorization"].includes("="));
});

Deno.test("sign: also injects the realm header, which the API requires on every call", () => {
  const request: SignableRequest = {
    url: "https://api.quickbase.com/v1/apps/bqrapp1",
    method: "GET",
    headers: {},
  };
  const signed = auth.sign!({ request, credential }, mockCtx().ctx) as SignableRequest;

  assertEquals(signed.headers["qb-realm-hostname"], "acme.quickbase.com");
});

Deno.test("sign: never puts the token in the URL", () => {
  const request: SignableRequest = {
    url: "https://api.quickbase.com/v1/apps/bqrapp1",
    method: "GET",
    headers: {},
  };
  const signed = auth.sign!({ request, credential }, mockCtx().ctx) as SignableRequest;

  assert(!signed.url.includes(credential.userToken));
});

Deno.test("test: probes GET /apps/{appId} and passes on 200", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "bqrapp1", name: "Ops" } }]);
  const result = await auth.test({ credential }, ctx);

  assertEquals(result, { ok: true });
  assertEquals(calls[0].url, "https://api.quickbase.com/v1/apps/bqrapp1");
  assertEquals(calls[0].headers["authorization"], "QB-USER-TOKEN b1234567_abc_defghij");
  assertEquals(calls[0].headers["qb-realm-hostname"], "acme.quickbase.com");
});

Deno.test("test: probes the EU host for a .quickbase.eu realm", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await auth.test({ credential: { ...credential, realm: "acme.quickbase.eu" } }, ctx);

  assertEquals(new URL(calls[0].url).host, "api.quickbase.eu");
});

Deno.test("test: distinguishes an unknown token (401) from an unassigned one (403)", async () => {
  const unauthorized = mockCtx([{ status: 401, body: {} }]);
  const r401 = await auth.test({ credential }, unauthorized.ctx) as {
    ok: boolean;
    message?: string;
  };
  assertEquals(r401.ok, false);
  assert(r401.message!.includes("not recognised"));

  const forbidden = mockCtx([{ status: 403, body: {} }]);
  const r403 = await auth.test({ credential }, forbidden.ctx) as {
    ok: boolean;
    message?: string;
  };
  assertEquals(r403.ok, false);
  assert(r403.message!.includes("not assigned"));
});

Deno.test("test: a failure message never leaks the token", async () => {
  const { ctx } = mockCtx([{ status: 401, body: {} }]);
  const r = await auth.test({ credential }, ctx) as { ok: boolean; message?: string };
  assert(!r.message!.includes(credential.userToken));
});

Deno.test("test: rejects an incomplete credential without a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const r = await auth.test({ credential: { realm: "acme.quickbase.com" } }, ctx) as {
    ok: boolean;
    message?: string;
  };
  assertEquals(r.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("afterConnect: records realm + appId + app name, and no secret", async () => {
  const { ctx } = mockCtx([{ body: { id: "bqrapp1", name: "Ops Tracker" } }]);
  const display = await auth.afterConnect!({ credential }, ctx);

  assertEquals(display, {
    realm: "acme.quickbase.com",
    appId: "bqrapp1",
    app: { id: "bqrapp1", name: "Ops Tracker" },
  });
  assert(!JSON.stringify(display).includes(credential.userToken));
});

Deno.test("afterConnect: still records the routing data when the app read fails", async () => {
  // The realm is what picks the API host, so losing it would be worse than
  // losing the label.
  const { ctx } = mockCtx([{ status: 403, body: {} }]);
  const display = await auth.afterConnect!({ credential }, ctx);
  assertEquals(display, { realm: "acme.quickbase.com", appId: "bqrapp1" });
});

Deno.test("declares the three fields the API needs, with the token as a secret", () => {
  const keys = auth.fields!.map((f) => f.key);
  assertEquals(keys, ["realm", "userToken", "appId"]);
  assertEquals(auth.fields!.find((f) => f.key === "userToken")!.type, "secret");
  assert(auth.fields!.every((f) => f.required));
});
