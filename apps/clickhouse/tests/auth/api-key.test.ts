import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

const cred = { keyId: "ABC123", keySecret: "4b1secret" };
const orgs = { status: 200, body: { result: [{ id: "org-uuid", name: "Acme" }] } };

/** Key id as the Basic username, key secret as the password. */
Deno.test("api-key: signs as HTTP Basic with the id and secret", () => {
  const request = {
    url: "https://api.clickhouse.cloud/v1/organizations",
    headers: {} as Record<string, string>,
  };
  const signed = auth.sign!(
    { request, credential: cred } as never,
    mockCtx([]).ctx,
  ) as typeof request;
  assertEquals(signed.headers["authorization"], `Basic ${btoa("ABC123:4b1secret")}`);
  assertEquals(auth.type, "basic");
});

Deno.test("api-key: the test lists organizations and names the one it found", async () => {
  const { ctx, calls } = mockCtx([orgs]);
  const result = await auth.test!({ credential: cred } as never, ctx);
  assertEquals(calls[0].url, "https://api.clickhouse.cloud/v1/organizations");
  assertEquals(result.ok, true);
  assert(/Acme/.test(result.message!), result.message);
});

/** A key is created inside an organisation, so seeing none is wrong. */
Deno.test("api-key: seeing no organisation is reported as unexpected", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { result: [] } }]);
  const result = await auth.test!({ credential: cred } as never, ctx);
  assertEquals(result.ok, false);
  assert(/should not happen/.test(result.message!), result.message);
  assert(/revoked at the organisation level/.test(result.message!), result.message);
});

Deno.test("api-key: a rejected key surfaces the explanation", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { error: "unauthorized" } }]);
  const result = await auth.test!({ credential: cred } as never, ctx);
  assertEquals(result.ok, false);
  assert(/key ID and a key SECRET/.test(result.message!), result.message);
});

Deno.test("api-key: missing fields and an unreachable host fail cleanly", async () => {
  const none = mockCtx([]);
  assertEquals((await auth.test!({ credential: {} } as never, none.ctx)).ok, false);
  assertEquals(none.calls.length, 0);

  const offline = {
    fetch: () => Promise.reject(new Error("dns")),
    log: () => {},
  } as unknown as Parameters<NonNullable<typeof auth.test>>[1];
  assertEquals((await auth.test!({ credential: cred } as never, offline)).ok, false);
});

/** Every control-plane path begins with the organisation. */
Deno.test("api-key: afterConnect records the organisation and the plane", async () => {
  const { ctx } = mockCtx([orgs]);
  const display = await auth.afterConnect!({ credential: cred }, ctx) as Record<string, unknown>;
  assertEquals(display.organizationId, "org-uuid");
  assertEquals(display.organizationName, "Acme");
  assertEquals(display.plane, "control");
});

Deno.test("api-key: afterConnect survives the call failing", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  assertEquals(await auth.afterConnect!({ credential: cred }, ctx), {});
});

/** A read-only key connects perfectly and fails on the first change. */
Deno.test("api-key: says the secret is shown once and this cannot run SQL", () => {
  assert(/CANNOT run SQL/.test(auth.description!), auth.description);
  const secret = auth.fields!.find((f) => f.key === "keySecret")!;
  assert(/Shown ONCE/.test(secret.hint!), secret.hint);
  assert(/read-only key connects successfully/.test(secret.hint!), secret.hint);
  assertEquals(auth.fields!.every((f) => f.type === "secret"), true);
});
