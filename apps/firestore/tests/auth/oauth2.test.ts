import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/oauth2.ts";

Deno.test("oauth2: Google's identity endpoints, with offline access for a refresh token", () => {
  assertEquals(auth.oauth2!.authorizationUrl, "https://accounts.google.com/o/oauth2/v2/auth");
  assertEquals(auth.oauth2!.tokenUrl, "https://oauth2.googleapis.com/token");
  assertEquals(auth.oauth2!.refreshUrl, "https://oauth2.googleapis.com/token");
  assertEquals(auth.oauth2!.revokeUrl, "https://oauth2.googleapis.com/revoke");
  // Without both of these Google does not reliably return a refresh token.
  assertEquals(auth.oauth2!.extraAuthParams?.access_type, "offline");
  assertEquals(auth.oauth2!.extraAuthParams?.prompt, "consent");
  assertEquals(auth.oauth2!.pkce, true);
});

/** One narrow scope — `cloud-platform` would grant every Google Cloud API. */
Deno.test("oauth2: asks for the datastore scope only", () => {
  assertEquals(auth.oauth2!.scopes, ["https://www.googleapis.com/auth/datastore"]);
  for (const scope of auth.oauth2!.scopes ?? []) {
    assert(!scope.includes("cloud-platform"), `unexpectedly broad scope: ${scope}`);
  }
});

Deno.test("oauth2: the project is a required connection field, the database optional", () => {
  const fields = auth.fields ?? [];
  assertEquals(fields.map((f) => f.key), ["projectId", "databaseId"]);
  assertEquals(fields[0].required, true);
  assertEquals(fields[0].type, "string");
  // Non-secret: it is part of the URL, not a credential.
  assertEquals(fields[0].secret, undefined);
  assertEquals(fields[1].default, "(default)");
});

Deno.test("oauth2: signs with the bearer token", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://firestore.googleapis.com/v1/projects/p1/databases/(default)",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { accessToken: "at" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer at");
});

Deno.test("oauth2: the probe reads the database resource, never a document", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { name: "projects/p1/databases/(default)", type: "FIRESTORE_NATIVE" },
  }]);
  assertEquals(
    await auth.test!({ credential: { accessToken: "at", projectId: "p1" } } as never, ctx),
    { ok: true },
  );
  assertEquals(new URL(calls[0].url).pathname, "/v1/projects/p1/databases/(default)");
  assertEquals(calls[0].headers["authorization"], "Bearer at");
});

Deno.test("oauth2: the named database on the connection is the one probed", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { name: "n" } }]);
  await auth.test!(
    { credential: { accessToken: "at", projectId: "p1", databaseId: "named" } } as never,
    ctx,
  );
  assertEquals(new URL(calls[0].url).pathname, "/v1/projects/p1/databases/named");
});

/**
 * The verdict comes from `error.status` in the body: 403 in particular means
 * two different things and the message has to say both.
 */
Deno.test("oauth2: a failed probe is classified from the body's error.status", async () => {
  const cases: Array<[number, string, string, string]> = [
    [
      401,
      "UNAUTHENTICATED",
      "Google rejected the token",
      "UNAUTHENTICATED",
    ],
    [
      403,
      "PERMISSION_DENIED",
      "The caller does not have permission",
      "PERMISSION_DENIED",
    ],
    [404, "NOT_FOUND", "Database not found", "no such database"],
  ];
  for (const [http, status, message, needle] of cases) {
    const { ctx } = mockCtx([{ status: http, body: { error: { code: http, message, status } } }]);
    const result = await auth.test!(
      { credential: { accessToken: "at", projectId: "p1" } } as never,
      ctx,
    ) as { ok: boolean; message: string };
    assertEquals(result.ok, false);
    assert(result.message.includes(needle), `${http}: ${result.message}`);
  }
});

Deno.test("oauth2: an unfamiliar error body still fails, without inventing a reason", async () => {
  const { ctx } = mockCtx([{ status: 500, body: { error: { code: 500, message: "boom" } } }]);
  const result = await auth.test!(
    { credential: { accessToken: "at", projectId: "p1" } } as never,
    ctx,
  ) as { ok: boolean; message: string };
  assertEquals(result.ok, false);
  assert(result.message.includes("boom"), result.message);
});

/** A 200 that is not the documented `Database` resource is not a valid probe. */
Deno.test("oauth2: a 200 without a Database body is not accepted", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { nope: true } }]);
  const result = await auth.test!(
    { credential: { accessToken: "at", projectId: "p1" } } as never,
    ctx,
  ) as { ok: boolean };
  assertEquals(result.ok, false);
});

Deno.test("oauth2: a missing token or project fails before any network call", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals(await auth.test!({ credential: {} } as never, ctx), {
    ok: false,
    message: "credential missing accessToken",
  });
  assertEquals(await auth.test!({ credential: { accessToken: "at" } } as never, ctx), {
    ok: false,
    message: "credential missing projectId",
  });
  assertEquals(calls.length, 0);
});

Deno.test("oauth2: afterConnect records the project, database and database metadata", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      name: "projects/p1/databases/(default)",
      type: "FIRESTORE_NATIVE",
      concurrencyMode: "PESSIMISTIC",
      locationId: "eur3",
    },
  }]);
  assertEquals(
    await auth.afterConnect!(
      { credential: { projectId: " p1 ", databaseId: " " } } as never,
      ctx,
    ),
    {
      projectId: "p1",
      databaseId: "(default)",
      name: "projects/p1/databases/(default)",
      type: "FIRESTORE_NATIVE",
      concurrencyMode: "PESSIMISTIC",
      locationId: "eur3",
    },
  );
});

Deno.test("oauth2: afterConnect is best-effort — a failed metadata read still connects", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: { error: { code: 403, status: "PERMISSION_DENIED" } },
  }]);
  assertEquals(
    await auth.afterConnect!({ credential: { projectId: "p1" } } as never, ctx),
    { projectId: "p1", databaseId: "(default)" },
  );
});
