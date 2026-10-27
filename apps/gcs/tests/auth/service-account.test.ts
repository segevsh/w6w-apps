import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/service-account.ts";
import * as mod from "../../auth/service-account.ts";
import app from "../../index.ts";

const SENTINEL = "SENTINEL-BODY-TEXT-do-not-leak";
const PROBE = "https://storage.googleapis.com/storage/v1/b?project=p1&maxResults=1";
const input = {
  credential: null,
  binding: { settings: { projectId: "p1" } },
  credentialDisplay: { client_email: "sa@p1.iam.gserviceaccount.com" },
} as never;

Deno.test("service-account: declares the serviceAccount shape", () => {
  assertEquals(auth.key, "service-account");
  assertEquals(auth.type, "serviceAccount");
  const { bindingFields, ...rest } = auth.serviceAccount!;
  assertEquals(rest, {
    accepts: ["google-service-account.v1"],
    scopes: ["https://www.googleapis.com/auth/devstorage.full_control"],
    impersonation: "none",
  });
  assertEquals(
    (bindingFields ?? []).map((f) => [f.key, f.required === true]),
    [["projectId", false]],
  );
  assertEquals(
    (auth.fields ?? []).map((f) => [f.key, f.type, f.secret === true]),
    [["serviceAccountKey", "json", true]],
  );
  assertEquals(app.auth!.map((x) => x.key), ["service-account"]);
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

Deno.test("service-account: test lists one bucket page with no own authorization", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { items: [{ name: "b" }] } }]);
  const out = await auth.test(input, ctx);
  assertEquals(out.ok, true);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].url, PROBE);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("service-account: test without a project says so and makes no call", async () => {
  const { ctx, calls } = mockCtx();
  const out = await auth.test({ credential: null } as never, ctx);
  assertEquals(out.ok, true);
  assertStringIncludes(out.message ?? "", "not been checked");
  assertEquals(calls.length, 0);
});

Deno.test("service-account: test failures carry the status and reason, never the body", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: { error: { message: SENTINEL, errors: [{ reason: "forbidden", message: SENTINEL }] } },
  }]);
  const out = await auth.test(input, ctx);
  assertEquals(out.ok, false);
  assertStringIncludes(out.message ?? "", "403");
  assertEquals((out.message ?? "").includes(SENTINEL), false);
  const plain = mockCtx([{ status: 404, body: SENTINEL }]);
  assertEquals(((await auth.test(input, plain.ctx)).message ?? "").includes(SENTINEL), false);
});

Deno.test("service-account: afterConnect reads the email from display and the project from the binding", () => {
  assertEquals(auth.afterConnect!(input, mockCtx().ctx), {
    clientEmail: "sa@p1.iam.gserviceaccount.com",
    projectId: "p1",
  });
  assertEquals(
    auth.afterConnect!({ credential: null } as never, mockCtx().ctx),
    { clientEmail: undefined, projectId: undefined },
  );
});
