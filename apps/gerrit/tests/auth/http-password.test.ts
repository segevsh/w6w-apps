import { assert, assertEquals, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/http-password.ts";

const credential = {
  host: "https://gerrit.example.com",
  username: "ada",
  httpPassword: "generated-secret",
};
const PREFIX = ")]}'\n";
const self = (extra: Record<string, unknown> = {}) => ({
  status: 200,
  body: PREFIX +
    JSON.stringify({ _account_id: 1000, name: "Ada Lovelace", username: "ada", ...extra }),
});

Deno.test("http-password: signs as basic auth with the username and HTTP password", () => {
  const request = { url: "https://x", headers: {} as Record<string, string> };
  const signed = auth.sign!({ request, credential } as never, mockCtx([]).ctx) as typeof request;
  assertEquals(atob(signed.headers["authorization"].slice(6)), "ada:generated-secret");
});

/** The bare path would hide a broken credential behind anonymous access. */
Deno.test("http-password: the test probes /a/accounts/self", async () => {
  const { ctx, calls } = mockCtx([self()]);
  const result = await auth.test!({ credential } as never, ctx);
  assertEquals(calls[0].url, "https://gerrit.example.com/a/accounts/self");
  assertEquals(result.ok, true);
  assert(/Ada Lovelace/.test(result.message!), result.message);
  assert(/per project and per ref/.test(result.message!), result.message);
});

/** An inactive account authenticates and can do nothing. */
Deno.test("http-password: an inactive account fails the test", async () => {
  const { ctx } = mockCtx([self({ inactive: true })]);
  const result = await auth.test!({ credential } as never, ctx);
  assertEquals(result.ok, false);
  assert(/INACTIVE/.test(result.message!), result.message);
});

Deno.test("http-password: a rejected credential names the HTTP password", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "<html>Error 401</html>" }]);
  const result = await auth.test!({ credential } as never, ctx);
  assertEquals(result.ok, false);
  assert(/HTTP password/.test(result.message!), result.message);
});

Deno.test("http-password: exchange normalises the host and requires both fields", () => {
  const stored = auth.exchange!(
    { fields: { host: "gerrit.example.com/a", username: "ada", httpPassword: "x" } },
    mockCtx([]).ctx,
  ) as Record<string, unknown>;
  assertEquals(stored.host, "https://gerrit.example.com");
  assertThrows(
    () => auth.exchange!({ fields: { host: "x", username: "ada" } }, mockCtx([]).ctx),
    Error,
    "both required",
  );
});

/** The version endpoint is unauthenticated and returns a bare JSON string. */
Deno.test("http-password: afterConnect records the version, never the password", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: PREFIX + '"3.14.2-622-ge70cefe8a2"' }]);
  const display = await auth.afterConnect!({ credential }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://gerrit.example.com/config/server/version");
  assertEquals(display.version, "3.14.2-622-ge70cefe8a2");
  assertEquals(display.hostLabel, "gerrit.example.com");
  assert(!JSON.stringify(display).includes("generated-secret"), JSON.stringify(display));
});

Deno.test("http-password: afterConnect survives a Gerrit that will not answer", async () => {
  const ctx = {
    fetch: () => Promise.reject(new Error("dns")),
    log: () => {},
  } as unknown as Parameters<NonNullable<typeof auth.test>>[1];
  const display = await auth.afterConnect!({ credential }, ctx) as Record<string, unknown>;
  assertEquals(display.version, "");
});

Deno.test("http-password: the hints name the username and the credential kind", () => {
  const username = auth.fields!.find((f) => f.key === "username")!;
  assert(/An email address will not work/.test(username.hint!), username.hint);
  const password = auth.fields!.find((f) => f.key === "httpPassword")!;
  assert(/only credential a program can use/.test(password.hint!), password.hint);
});
