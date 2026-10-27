import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/service-account.ts";
import * as mod from "../../auth/service-account.ts";
import app from "../../index.ts";

const SENTINEL = "SENTINEL-BODY-TEXT-do-not-leak";
const PROBE =
  "https://europe-west4-aiplatform.googleapis.com/v1/projects/p1/locations/europe-west4/endpoints?pageSize=1";
const input = {
  credential: null,
  binding: { settings: { projectId: "p1", location: "europe-west4" } },
  credentialDisplay: { client_email: "sa@p1.iam.gserviceaccount.com" },
} as never;

Deno.test("service-account: declares the serviceAccount shape", () => {
  assertEquals(auth.key, "service-account");
  assertEquals(auth.type, "serviceAccount");
  const { bindingFields, ...rest } = auth.serviceAccount!;
  assertEquals(rest, {
    accepts: ["google-service-account.v1"],
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    impersonation: "none",
  });
  assertEquals(
    (bindingFields ?? []).map((f) => [f.key, f.required === true]),
    [["projectId", true], ["location", false]],
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

Deno.test("service-account: test probes the binding's region with no own authorization", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  const out = await auth.test(input, ctx);
  assertEquals(out.ok, true);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].url, PROBE);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("service-account: test defaults the location and needs a project (no fetch)", async () => {
  const a = mockCtx([{ status: 200, body: {} }]);
  await auth.test({ credential: null, binding: { settings: { projectId: "p1" } } } as never, a.ctx);
  assertEquals(
    a.calls[0].url,
    "https://us-central1-aiplatform.googleapis.com/v1/projects/p1/locations/us-central1/endpoints?pageSize=1",
  );
  const b = mockCtx();
  const out = await auth.test({ credential: null } as never, b.ctx);
  assertEquals(out.ok, false);
  assertEquals(b.calls.length, 0);
});

Deno.test("service-account: test failures carry status tokens, never body text", async () => {
  for (
    const [code, status] of [[400, "INVALID_ARGUMENT"], [403, "PERMISSION_DENIED"], [
      500,
      "",
    ]] as const
  ) {
    const { ctx } = mockCtx([{
      status: code,
      body: { error: { code, message: SENTINEL, status, errors: [{ message: SENTINEL }] } },
    }]);
    const out = await auth.test(input, ctx);
    assertEquals(out.ok, false);
    assertEquals((out.message ?? "").includes(SENTINEL), false);
  }
  const { ctx } = mockCtx([{ status: 403, body: SENTINEL }]);
  assertStringIncludes((await auth.test(input, ctx)).message ?? "", "403");
});

Deno.test("service-account: afterConnect reads the email from display and the rest from the binding", () => {
  assertEquals(auth.afterConnect!(input, mockCtx().ctx), {
    clientEmail: "sa@p1.iam.gserviceaccount.com",
    projectId: "p1",
    location: "europe-west4",
  });
  assertEquals(
    auth.afterConnect!({ credential: null } as never, mockCtx().ctx),
    { clientEmail: undefined, projectId: undefined, location: "us-central1" },
  );
});
