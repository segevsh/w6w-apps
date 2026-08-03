import { assert, assertEquals } from "@std/assert";
import type { SignableRequest } from "@w6w/types";
import { mockCtx, page } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

Deno.test("api-key: declares the X-Api-Key header scheme", () => {
  assertEquals(auth.type, "apiKey");
  assertEquals(auth.apiKey, { in: "header", name: "X-Api-Key" });
});

Deno.test("api-key: the key field is a required secret", () => {
  const field = auth.fields?.find((f) => f.key === "apiKey");
  assertEquals(field?.type, "secret");
  assertEquals(field?.required, true);
  assertEquals(auth.fields?.length, 1);
});

Deno.test("api-key: sign stamps the credential onto the X-Api-Key header", () => {
  const request: SignableRequest = {
    url: "https://api.fathom.ai/external/v1/meetings",
    method: "GET",
    headers: {},
  };
  const signed = auth.sign!(
    { request, credential: { apiKey: "sekret" } },
    undefined as never,
  ) as SignableRequest;
  assertEquals(signed.headers["x-api-key"], "sekret");
  // No bearer form — Fathom's API-key scheme is the header, nothing else.
  assertEquals(signed.headers["authorization"], undefined);
});

Deno.test("api-key: test probes GET /meetings carrying the key itself", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);
  const result = await auth.test({ credential: { apiKey: "k" } }, ctx);

  assertEquals(result.ok, true);
  const url = new URL(calls[0].url);
  assertEquals(url.host, "api.fathom.ai");
  assertEquals(url.pathname, "/external/v1/meetings");
  // No include_* flag — `test` must stay on the cheap global rate-limit bucket.
  assertEquals(url.search, "");
  // `test` runs before a Connection exists, so it carries the credential itself.
  assertEquals(calls[0].headers["x-api-key"], "k");
});

Deno.test("api-key: test reports Fathom's status and body on a rejected key", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "Unauthorized" }]);
  const result = await auth.test({ credential: { apiKey: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("401"));
  assert(result.message?.includes("Unauthorized"));
});

Deno.test("api-key: test still reports a failure when the body is empty", async () => {
  const { ctx } = mockCtx([{ status: 500 }]);
  const result = await auth.test({ credential: { apiKey: "bad" } }, ctx);
  assertEquals(result, { ok: false, message: "Fathom returned HTTP 500" });
});

Deno.test("api-key: test fails fast when the credential has no key", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await auth.test({ credential: {} }, ctx);
  assertEquals(result, { ok: false, message: "credential missing apiKey" });
  assertEquals(calls.length, 0);
});

Deno.test("api-key: declares no afterConnect — Fathom publishes no whoami", () => {
  assertEquals(auth.afterConnect, undefined);
  assertEquals(auth.connectionLabel, undefined);
});
