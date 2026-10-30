import { test } from "node:test";
import { assertEquals, assertRejects, assertStringIncludes } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/service-account.ts";
import * as mod from "../../auth/service-account.ts";
import app from "../../index.ts";

const PROBE_URL = "https://www.googleapis.com/drive/v3/about?fields=user";
const SENTINEL = "SENTINEL-BODY-TEXT-do-not-leak";

test("service-account: declares the serviceAccount shape", () => {
  assertEquals(auth.key, "service-account");
  assertEquals(auth.type, "serviceAccount");
  const { bindingFields, ...rest } = auth.serviceAccount!;
  assertEquals(rest, {
    accepts: ["google-service-account.v1"],
    scopes: [
      "https://www.googleapis.com/auth/documents",
      "https://www.googleapis.com/auth/drive.file",
    ],
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

test("service-account: mint code is gone; only default is exported", () => {
  assertEquals(Object.keys(mod), ["default"]);
  assertEquals((auth as unknown as Record<string, unknown>).exchange, undefined);
  assertEquals((auth as unknown as Record<string, unknown>).refresh, undefined);
});

test("service-account: sign attaches Bearer without any network call", async () => {
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

test("service-account: sign throws on a missing token ({} and null)", async () => {
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

test("service-account: test makes one unsigned probe call and succeeds on 2xx", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { ok: true } }]);
  const out = await auth.test({ credential: null }, ctx);
  assertEquals(out.ok, true);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].url, PROBE_URL);
  assertEquals(calls[0].headers["authorization"], undefined);
});

test("service-account: test failure carries the status, never the body", async () => {
  const { ctx } = mockCtx([{ status: 403, body: SENTINEL }]);
  const out = await auth.test({ credential: null }, ctx);
  assertEquals(out.ok, false);
  assertStringIncludes(out.message ?? "", "403");
  assertEquals((out.message ?? "").includes(SENTINEL), false);
});
