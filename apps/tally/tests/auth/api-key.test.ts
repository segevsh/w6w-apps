import { assert, assertEquals } from "@std/assert";
import type { SignableRequest } from "@w6w/types";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";
import { VERSION_HEADER } from "../../lib/client.ts";

Deno.test("api-key: declares the Bearer header scheme", () => {
  assertEquals(auth.key, "api-key");
  assertEquals(auth.type, "apiKey");
  assertEquals(auth.apiKey, { in: "header", name: "Authorization", prefix: "Bearer " });
});

Deno.test("api-key: the key field is a required secret", () => {
  const field = auth.fields?.find((f) => f.key === "apiKey");
  assertEquals(field?.type, "secret");
  assertEquals(field?.required, true);
});

Deno.test("api-key: the version field is optional and date-validated", () => {
  const field = auth.fields?.find((f) => f.key === "apiVersion");
  assertEquals(field?.type, "string");
  assertEquals(field?.required, false);
  const pattern = new RegExp(field?.validation?.pattern ?? "");
  assert(pattern.test("2025-02-01"));
  assert(!pattern.test("latest"));
});

Deno.test("api-key: sign stamps the credential as a Bearer token", () => {
  const request: SignableRequest = {
    url: "https://api.tally.so/users/me",
    method: "GET",
    headers: {},
  };
  const signed = auth.sign!(
    { request, credential: { apiKey: "sekret" } },
    undefined as never,
  ) as SignableRequest;
  assertEquals(signed.headers["authorization"], "Bearer sekret");
});

Deno.test("api-key: test probes GET /users/me carrying the credential", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "u1", email: "a@b.com" } }]);
  const result = await auth.test({ credential: { apiKey: "k" } }, ctx);

  assertEquals(result.ok, true);
  assertEquals(new URL(calls[0].url).pathname, "/users/me");
  // `test` runs before a Connection exists, so it carries the credential itself.
  assertEquals(calls[0].headers["authorization"], "Bearer k");
  assertEquals(calls[0].headers[VERSION_HEADER], undefined);
});

Deno.test("api-key: test forwards a pinned version on the probe", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await auth.test({ credential: { apiKey: "k", apiVersion: "2025-02-01" } }, ctx);
  assertEquals(calls[0].headers[VERSION_HEADER], "2025-02-01");
});

Deno.test("api-key: test reports Tally's plain-text rejection", async () => {
  // Verified live 2026-08-03: a bad key answers 401 text/plain "Unauthorized".
  const { ctx } = mockCtx([
    { status: 401, body: "Unauthorized", headers: { "content-type": "text/plain" } },
  ]);
  const result = await auth.test({ credential: { apiKey: "bad" } }, ctx);
  assertEquals(result, { ok: false, message: "Unauthorized" });
});

Deno.test("api-key: test surfaces a JSON error message when there is one", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { message: "Key revoked" } }]);
  const result = await auth.test({ credential: { apiKey: "bad" } }, ctx);
  assertEquals(result, { ok: false, message: "Key revoked" });
});

Deno.test("api-key: test falls back to the status when the body is empty", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  const result = await auth.test({ credential: { apiKey: "k" } }, ctx);
  assertEquals(result, { ok: false, message: "Tally returned HTTP 500" });
});

Deno.test("api-key: test fails fast when the credential has no key", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await auth.test({ credential: {} }, ctx);
  assertEquals(result, { ok: false, message: "credential missing apiKey" });
  assertEquals(calls.length, 0);
});

Deno.test("api-key: afterConnect records the user and never the credential", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "u1", email: "a@b.com" } }]);
  const display = await auth.afterConnect!({ credential: { apiKey: "k" } }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/users/me");
  // afterConnect is routed through `sign`; it must not carry the credential itself.
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(display, { user: { id: "u1", email: "a@b.com" } });
});

Deno.test("api-key: afterConnect records a pinned version for the client to reuse", async () => {
  const { ctx } = mockCtx([{ body: { id: "u1" } }]);
  const display = await auth.afterConnect!(
    { credential: { apiKey: "k", apiVersion: "2025-02-01" } },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(display.apiVersion, "2025-02-01");
});

Deno.test("api-key: afterConnect still returns display data when the whoami fails", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "oops" }]);
  const display = await auth.afterConnect!(
    { credential: { apiVersion: "2025-01-15" } },
    ctx,
  );
  assertEquals(display, { apiVersion: "2025-01-15" });
});
