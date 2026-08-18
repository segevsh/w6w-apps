import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/service-account.ts";

const credential = {
  serviceAccountUsername: "svc.abc.mp-service-account",
  serviceAccountSecret: "s3cret",
  projectId: "123",
  region: "us",
};

Deno.test("service-account: signs with HTTP Basic", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://mixpanel.com/api/query/segmentation",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential }, ctx);
  assertEquals(
    out.headers["authorization"],
    `Basic ${btoa("svc.abc.mp-service-account:s3cret")}`,
  );
});

/**
 * /engage takes its credential in the BODY, and only this hook may hold one.
 */
Deno.test("service-account: sign stamps $token into an /engage payload", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://api.mixpanel.com/engage?verbose=1",
    method: "POST" as const,
    headers: {} as Record<string, string>,
    body: JSON.stringify([{ $distinct_id: "u1", $set: { plan: "pro" } }]),
  };
  const out = await auth.sign!(
    { request, credential: { ...credential, projectToken: "tok-123" } },
    ctx,
  );
  assertEquals(JSON.parse(out.body!), [
    { $token: "tok-123", $distinct_id: "u1", $set: { plan: "pro" } },
  ]);
});

Deno.test("service-account: no other route gets a token in its body", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://api.mixpanel.com/import?strict=1",
    method: "POST" as const,
    headers: {} as Record<string, string>,
    body: JSON.stringify([{ event: "x" }]),
  };
  const out = await auth.sign!(
    { request, credential: { ...credential, projectToken: "tok-123" } },
    ctx,
  );
  assert(!out.body!.includes("$token"), out.body!);
});

Deno.test("service-account: without a token the engage body is left alone", async () => {
  const { ctx } = mockCtx();
  const body = JSON.stringify([{ $distinct_id: "u1" }]);
  const out = await auth.sign!({
    request: {
      url: "https://api.mixpanel.com/engage",
      method: "POST" as const,
      headers: {} as Record<string, string>,
      body,
    },
    credential,
  }, ctx);
  assertEquals(out.body, body);
});

Deno.test("service-account: a body that is not the expected array is not mangled", async () => {
  const { ctx } = mockCtx();
  const out = await auth.sign!({
    request: {
      url: "https://api.mixpanel.com/engage",
      method: "POST" as const,
      headers: {} as Record<string, string>,
      body: "not json",
    },
    credential: { ...credential, projectToken: "tok" },
  }, ctx);
  assertEquals(out.body, "not json");
});

/** /api/app/me is not a query, so testing does not spend one of the sixty. */
Deno.test("service-account: test uses the identity route, not a query", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { results: { projects: { "123": { name: "Prod" } } } },
  }]);
  const out = await auth.test!({ credential }, ctx);
  assertEquals(out.ok, true);
  assertEquals(new URL(calls[0].url).pathname, "/api/app/me");
  assert(!calls[0].url.includes("/api/query/"), calls[0].url);
});

Deno.test("service-account: bad credentials are named as such, with the region", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { status: "error", error: "Invalid service account credentials" },
  }]);
  const out = await auth.test!({ credential: { ...credential, region: "eu" } }, ctx);
  assertEquals(out.ok, false);
  assert(/EU/.test(out.message!), out.message);
});

/** A working account pointed at a project it cannot see is a specific failure. */
Deno.test("service-account: an inaccessible project is reported precisely", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { results: { projects: { "999": { name: "Other" } } } },
  }]);
  const out = await auth.test!({ credential }, ctx);
  assertEquals(out.ok, false);
  assert(/not one it can reach/.test(out.message!), out.message);
});

Deno.test("service-account: afterConnect records whether a token exists, never the token", () => {
  const display = auth.afterConnect!(
    { credential: { ...credential, projectToken: "tok-123" } },
    mockCtx().ctx,
  ) as Record<string, unknown>;
  assertEquals(display.projectId, "123");
  assertEquals(display.region, "us");
  assertEquals(display.hasProjectToken, true);
  assert(!JSON.stringify(display).includes("tok-123"));
  assert(!JSON.stringify(display).includes("s3cret"));
});

Deno.test("service-account: the secret and token fields are declared secret", () => {
  for (const key of ["serviceAccountSecret", "projectToken"]) {
    assertEquals(auth.fields!.find((f) => f.key === key)!.type, "secret", key);
  }
});
