import { assertEquals, assertNotEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/service-account.ts";
import * as mod from "../../auth/service-account.ts";
import app from "../../index.ts";

const PROBE_URL = "https://slides.googleapis.com/v1/presentations/w6w-credential-probe-nonexistent";
const SENTINEL = "SENTINEL-BODY-TEXT-do-not-leak";

Deno.test("service-account: declares the serviceAccount shape", () => {
  assertEquals(auth.key, "service-account");
  assertEquals(auth.type, "serviceAccount");
  const { bindingFields, ...rest } = auth.serviceAccount!;
  assertEquals(rest, {
    accepts: ["google-service-account.v1"],
    scopes: ["https://www.googleapis.com/auth/presentations"],
    impersonation: "optional",
  });
  assertEquals(
    (bindingFields ?? []).map((f) => [f.key, f.required === true]),
    [["delegatedUser", false]],
  );
  assertEquals(
    (auth.fields ?? []).map((f) => [f.key, f.type, f.secret === true]),
    [["serviceAccountKey", "json", true]],
  );
  assertEquals(app.auth.map((x) => x.key), ["oauth2", "service-account"]);
});

Deno.test("service-account: mint code is gone; only default is exported", () => {
  assertEquals(Object.keys(mod), ["default"]);
  assertEquals((auth as unknown as Record<string, unknown>).exchange, undefined);
  assertEquals((auth as unknown as Record<string, unknown>).refresh, undefined);
});

Deno.test("service-account: sign attaches Bearer without any network call", async () => {
  const { ctx, calls } = mockCtx();
  const request = {
    url: "https://x.example/y",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!(
    { request, credential: { accessToken: "tok", tokenType: "Bearer", expiresAt: 1 } },
    ctx,
  );
  assertEquals(out.headers["authorization"], "Bearer tok");
  assertEquals(calls.length, 0);
});

Deno.test("service-account: sign throws on a missing token ({} and null)", async () => {
  for (const credential of [{}, null]) {
    const { ctx } = mockCtx();
    const request = {
      url: "https://x.example/y",
      method: "GET",
      headers: {} as Record<string, string>,
    };
    await assertRejects(async () => await auth.sign!({ request, credential }, ctx));
  }
});

Deno.test("service-account: test probes a sentinel presentation; 404 is ok", async () => {
  const { ctx, calls } = mockCtx([{ status: 404, body: { error: "x" } }]);
  const out = await auth.test({ credential: null }, ctx);
  assertEquals(out.ok, true);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].url, PROBE_URL);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("service-account: test maps 401 and 403 to distinct failures", async () => {
  const r401 = await auth.test(
    { credential: null },
    mockCtx([{ status: 401, body: SENTINEL }]).ctx,
  );
  const r403 = await auth.test(
    { credential: null },
    mockCtx([{ status: 403, body: SENTINEL }]).ctx,
  );
  assertEquals(r401.ok, false);
  assertEquals(r403.ok, false);
  assertStringIncludes(r401.message ?? "", "401");
  assertStringIncludes(r403.message ?? "", "403");
  assertNotEquals(r401.message, r403.message);
  assertEquals((r401.message ?? "").includes(SENTINEL), false);
  assertEquals((r403.message ?? "").includes(SENTINEL), false);
});
