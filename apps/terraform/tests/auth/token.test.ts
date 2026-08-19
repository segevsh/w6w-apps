import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/token.ts";

const cred = { host: "https://app.terraform.io", token: "atlasv1.secret" };

const account = {
  status: 200,
  body: {
    data: {
      type: "users",
      id: "user-1",
      attributes: { username: "deployer", email: "d@example.com", "is-service-account": true },
    },
  },
};

Deno.test("token: signs as a bearer", () => {
  const request = {
    url: "https://app.terraform.io/api/v2/organizations",
    headers: {} as Record<string, string>,
  };
  const signed = auth.sign!(
    { request, credential: cred } as never,
    mockCtx([]).ctx,
  ) as typeof request;
  assertEquals(signed.headers["authorization"], "Bearer atlasv1.secret");
  assertEquals(auth.type, "bearer");
});

/** /api/v2/ping answers 204 unauthenticated, so it proves nothing here. */
Deno.test("token: tests against account details, not the ping that needs no token", async () => {
  const { ctx, calls } = mockCtx([account]);
  const result = await auth.test!({ credential: cred } as never, ctx);
  assertEquals(calls[0].url, "https://app.terraform.io/api/v2/account/details");
  assertEquals(calls[0].headers["accept"], "application/vnd.api+json");
  assertEquals(result.ok, true);
  assert(/deployer/.test(result.message!), result.message);
  assert(/service account/.test(result.message!), result.message);
});

Deno.test("token: defaults to the managed service and accepts a self-hosted host", async () => {
  const { ctx, calls } = mockCtx([account]);
  await auth.test!({ credential: { token: "x" } } as never, ctx);
  assertEquals(calls[0].url, "https://app.terraform.io/api/v2/account/details");

  const enterprise = mockCtx([account]);
  await auth.test!(
    { credential: { host: "tfe.example.com", token: "x" } } as never,
    enterprise.ctx,
  );
  assertEquals(enterprise.calls[0].url, "https://tfe.example.com/api/v2/account/details");
});

/** A token is valid on the instance that issued it and nowhere else. */
Deno.test("token: a rejection points at the instance as well as the token", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { errors: [{ status: "401", title: "unauthorized" }] },
  }]);
  const result = await auth.test!({ credential: cred } as never, ctx);
  assertEquals(result.ok, false);
  assert(/a token from a different Terraform Enterprise/.test(result.message!), result.message);
});

Deno.test("token: a missing token or an unreachable host fails cleanly", async () => {
  const none = mockCtx([]);
  assertEquals((await auth.test!({ credential: {} } as never, none.ctx)).ok, false);
  assertEquals(none.calls.length, 0);

  const offline = {
    fetch: () => Promise.reject(new Error("dns")),
    log: () => {},
  } as unknown as Parameters<NonNullable<typeof auth.test>>[1];
  const result = await auth.test!({ credential: cred } as never, offline);
  assertEquals(result.ok, false);
  assert(/could not reach/.test(result.message!), result.message);
});

/** A proxy or a landing page answers 200 with HTML. */
Deno.test("token: a non-JSON:API body fails rather than throwing", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "<html/>" }]);
  const result = await auth.test!({ credential: cred } as never, ctx);
  assertEquals(result.ok, false);
  assert(/rather than a Terraform instance/.test(result.message!), result.message);
});

/**
 * The ping is unauthenticated on purpose: the version headers are worth
 * recording even when the token turns out to be wrong.
 */
Deno.test("token: afterConnect records the host, product and API version", async () => {
  const { ctx, calls } = mockCtx([
    { status: 204, headers: { "tfp-appname": "HCP Terraform", "tfp-api-version": "2.6" } },
    account,
  ]);
  const display = await auth.afterConnect!({ credential: cred }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://app.terraform.io/api/v2/ping");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(display.host, "https://app.terraform.io");
  assertEquals(display.appName, "HCP Terraform");
  assertEquals(display.apiVersion, "2.6");
  assertEquals(display.username, "deployer");
  assertEquals(display.serviceAccount, true);
});

/** Terraform Enterprise reports its own product name. */
Deno.test("token: afterConnect records a self-hosted instance as such", async () => {
  const { ctx } = mockCtx([
    { status: 204, headers: { "tfp-appname": "Terraform Enterprise", "tfp-api-version": "2.5" } },
    { status: 200, body: { data: { attributes: { username: "svc" } } } },
  ], { display: {} });
  const display = await auth.afterConnect!(
    { credential: { host: "tfe.example.com", token: "x" } },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(display.appName, "Terraform Enterprise");
  assertEquals(display.host, "https://tfe.example.com");
});

Deno.test("token: afterConnect survives either call failing", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }, { status: 401, body: "{}" }]);
  const display = await auth.afterConnect!({ credential: cred }, ctx) as Record<string, unknown>;
  assertEquals(display.host, "https://app.terraform.io");
  assertEquals(display.username, undefined);
});

/** The three token kinds fail in ways that mention nothing about token kinds. */
Deno.test("token: the description and hint name the organization-token trap", () => {
  assert(
    /organization token cannot create runs or read state/.test(auth.description!),
    auth.description,
  );
  const field = auth.fields!.find((f) => f.key === "token")!;
  assert(/Prefer a USER token/.test(field.hint!), field.hint);
  assertEquals(field.type, "secret");
});
