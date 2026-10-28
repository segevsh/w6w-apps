import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-credentials.ts";

const fields = {
  host: "https://mycompany.cloud.looker.com",
  clientId: "abc",
  clientSecret: "shhh",
};
const token = { status: 200, body: { access_token: "tok-1", expires_in: 3600 } };
const user = (attributes: Record<string, unknown> = {}) => ({
  status: 200,
  body: { id: "42", display_name: "Workflow Bot", email: "bot@example.com", ...attributes },
});

/** Looker's spec documents both as query parameters. */
Deno.test("api-credentials: logs in with the credentials in the query string", async () => {
  const { ctx, calls } = mockCtx([token]);
  await auth.exchange!({ fields }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/4.0/login");
  assertEquals(calls[0].method, "POST");
  assertEquals(url.searchParams.get("client_id"), "abc");
  assertEquals(url.searchParams.get("client_secret"), "shhh");
  assertEquals(calls[0].body, null, "no body — Looker takes them in the URL");
});

Deno.test("api-credentials: keeps the credentials so refresh can log in again", async () => {
  const { ctx } = mockCtx([token]);
  const credential = await auth.exchange!({ fields }, ctx) as Record<string, unknown>;
  assertEquals(credential.clientId, "abc");
  assertEquals(credential.accessToken, "tok-1");
  const ttl = new Date(String(credential.expiresAt)).getTime() - Date.now();
  assert(ttl > 0 && ttl < 3600_000, `expiry ${ttl}ms is not inside the hour`);
});

/** The host is normalised at login, so the port is settled once. */
Deno.test("api-credentials: a self-hosted instance gets port 19999 at login", async () => {
  const { ctx, calls } = mockCtx([token]);
  const credential = await auth.exchange!(
    { fields: { ...fields, host: "looker.internal" } },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).host, "looker.internal:19999");
  assertEquals(credential.host, "https://looker.internal:19999");
});

Deno.test("api-credentials: signs with Looker's `token` scheme, not Bearer", () => {
  const request = { url: "https://x/api/4.0/user", headers: {} as Record<string, string> };
  const signed = auth.sign!(
    { request, credential: { accessToken: "tok-1" } } as never,
    mockCtx([]).ctx,
  ) as typeof request;
  assertEquals(signed.headers["authorization"], "token tok-1");
});

/** A browser URL on self-hosted Looker reaches something that is not the API. */
Deno.test("api-credentials: a non-JSON login response names the port", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "<html>Looker</html>" }]);
  let message = "";
  try {
    await auth.exchange!({ fields: { ...fields, host: "looker.internal" } }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/API is on port 19999/.test(message), message);
});

Deno.test("api-credentials: exchange refuses without all three values", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await auth.exchange!({ fields: { host: "x", clientId: "y" } }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/all required/.test(message), message);
  assertEquals(calls.length, 0);
});

Deno.test("api-credentials: the test names the user and what it implies", async () => {
  const { ctx, calls } = mockCtx([user()], {
    display: { host: "https://mycompany.cloud.looker.com" },
  });
  const result = await auth.test!(
    { credential: { ...fields, accessToken: "tok-1" } } as never,
    ctx,
  );
  assertEquals(calls[0].url, "https://mycompany.cloud.looker.com/api/4.0/user");
  assertEquals(result.ok, true);
  assert(/Workflow Bot/.test(result.message!), result.message);
  assert(/row-level access filters/.test(result.message!), result.message);
});

/** A token is issued for a disabled user and every query is refused. */
Deno.test("api-credentials: a disabled user fails the test", async () => {
  const { ctx } = mockCtx([user({ is_disabled: true })]);
  const result = await auth.test!(
    { credential: { ...fields, accessToken: "tok-1" } } as never,
    ctx,
  );
  assertEquals(result.ok, false);
  assert(/DISABLED Looker user/.test(result.message!), result.message);
});

Deno.test("api-credentials: an unreachable instance names the port", async () => {
  const ctx = {
    fetch: () => Promise.reject(new Error("connection refused")),
    log: () => {},
  } as unknown as Parameters<NonNullable<typeof auth.test>>[1];
  const result = await auth.test!(
    { credential: { ...fields, host: "looker.internal", accessToken: "tok-1" } } as never,
    ctx,
  );
  assertEquals(result.ok, false);
  assert(/port 19999/.test(result.message!), result.message);
});

Deno.test("api-credentials: afterConnect records the instance and the user", async () => {
  const { ctx } = mockCtx([user()]);
  const display = await auth.afterConnect!(
    { credential: { ...fields, accessToken: "tok-1" } },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(display.host, "https://mycompany.cloud.looker.com");
  assertEquals(display.userName, "Workflow Bot");
  assertEquals(display.userId, "42");
  assertEquals("clientSecret" in display, false);
});

/** There is no scope on a Looker API key. */
Deno.test("api-credentials: says the credential inherits the user's permissions", () => {
  assert(/inherits that USER's permissions/.test(auth.description!), auth.description);
  assert(/There is no scope on the key/.test(auth.description!), auth.description);
  const secret = auth.fields!.find((f) => f.key === "clientSecret")!;
  assert(/QUERY PARAMETERS/.test(secret.hint!), secret.hint);
});
