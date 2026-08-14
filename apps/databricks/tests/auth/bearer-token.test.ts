import { assert, assertEquals } from "@std/assert";
import bearerToken from "../../auth/bearer-token.ts";
import { mockCtx, TOKEN, WORKSPACE_URL } from "../_helpers.ts";

interface SignableRequest {
  url: string;
  headers: Record<string, string>;
}

/** `sign` is network-less, so the ctx it is handed makes no requests. */
function signWith(request: SignableRequest, credential: Record<string, unknown>) {
  return bearerToken.sign!({ request, credential } as never, mockCtx([]).ctx) as SignableRequest;
}

const PROBE_URL = `${WORKSPACE_URL}/api/2.0/preview/scim/v2/Me`;
const credential = { workspaceUrl: WORKSPACE_URL, accessToken: TOKEN };

/**
 * The workspace URL is a plain field, not a secret: every request URL is built
 * from it and it is republished on the Connection so actions can reach the host
 * without ever seeing the token.
 */
Deno.test("auth: takes a workspace host and a secret token", () => {
  assertEquals(bearerToken.key, "bearer-token");
  assertEquals(bearerToken.type, "apiKey");
  const fields = bearerToken.fields ?? [];
  assertEquals(fields.map((f) => f.key), ["workspaceUrl", "accessToken"]);
  assertEquals(fields.find((f) => f.key === "workspaceUrl")?.type, "string");
  assertEquals(fields.find((f) => f.key === "accessToken")?.type, "secret");
  for (const field of fields) assertEquals(field.required, true, `${field.key} must be required`);
});

Deno.test("auth: declares the header scheme it actually sends", () => {
  assertEquals(bearerToken.apiKey, { in: "header", name: "Authorization", prefix: "Bearer " });
});

/** Both fields are hard to find in the product, so both hints say where they live. */
Deno.test("auth: both fields tell the user where to find the value", () => {
  for (const field of bearerToken.fields ?? []) {
    assert((field.hint ?? "").length > 0, `${field.key} has no hint`);
  }
});

Deno.test("sign: stamps the bearer and leaves the URL alone", () => {
  const url = `${WORKSPACE_URL}/api/2.1/unity-catalog/catalogs`;
  const signed = signWith({ url, headers: {} }, credential);
  assertEquals(signed.headers["authorization"], `Bearer ${TOKEN}`);
  assertEquals(signed.url, url);
});

/**
 * The probe is SCIM's "current user" endpoint: it needs no workspace-specific
 * permission beyond being a valid user, so it is a liveness check for any token
 * rather than one that only passes for an admin.
 */
Deno.test("test: probes the SCIM Me endpoint on the connection's own workspace", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "42", userName: "ada@example.com" } }]);
  const result = await bearerToken.test!({ credential } as never, ctx);

  assertEquals(result, { ok: true });
  assertEquals(calls[0].url, PROBE_URL);
  assertEquals(calls[0].headers["authorization"], `Bearer ${TOKEN}`);
});

Deno.test("test: tolerates a trailing slash on the workspace URL", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "42" } }]);
  await bearerToken.test!(
    { credential: { ...credential, workspaceUrl: `${WORKSPACE_URL}//` } } as never,
    ctx,
  );
  assertEquals(calls[0].url, PROBE_URL);
});

/** Either half missing means there is nothing to probe — and no request to make. */
Deno.test("test: reports a missing field without making a request", async () => {
  for (const partial of [{}, { workspaceUrl: WORKSPACE_URL }, { accessToken: TOKEN }]) {
    const { ctx, calls } = mockCtx([]);
    const result = await bearerToken.test!({ credential: partial } as never, ctx);
    assertEquals(result.ok, false);
    assert(result.message!.includes("missing workspaceUrl or accessToken"), result.message);
    assertEquals(calls.length, 0);
  }
});

Deno.test("test: a rejected token reports the status", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { error_code: "PERMISSION_DENIED" } }]);
  const result = await bearerToken.test!({ credential } as never, ctx);
  assertEquals(result.ok, false);
  assert(result.message!.includes("403"), result.message);
});

/**
 * This is the value the client reads on every call, so recording it here is what
 * lets actions build request URLs without ever touching the credential.
 */
Deno.test("afterConnect: publishes the workspace host, normalised", async () => {
  const display = await bearerToken.afterConnect!(
    { credential: { ...credential, workspaceUrl: `${WORKSPACE_URL}/` } } as never,
    mockCtx([]).ctx,
  ) as Record<string, unknown>;
  assertEquals(display, { workspaceUrl: WORKSPACE_URL });
});

Deno.test("afterConnect: never republishes the token", async () => {
  const display = await bearerToken.afterConnect!({ credential } as never, mockCtx([]).ctx);
  assert(!JSON.stringify(display).includes(TOKEN));
});

Deno.test("afterConnect: with no workspace URL there is nothing to publish", async () => {
  assertEquals(
    await bearerToken.afterConnect!(
      { credential: { accessToken: TOKEN } } as never,
      mockCtx([]).ctx,
    ),
    {},
  );
});
