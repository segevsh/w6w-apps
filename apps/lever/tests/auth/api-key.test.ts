import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

const credential = { apiKey: "key123", environment: "production", dataCenter: "global" };
const users = { status: 200, body: { data: [{ name: "Ada Lovelace" }] } };

/** The key is the basic-auth username with an empty password. */
Deno.test("api-key: signs as basic auth with an empty password", () => {
  const request = { url: "https://x", headers: {} as Record<string, string> };
  const signed = auth.sign!({ request, credential } as never, mockCtx([]).ctx) as typeof request;
  const header = signed.headers["authorization"];
  assert(header.startsWith("Basic "), header);
  assertEquals(atob(header.slice(6)), "key123:", "the key is the username, password empty");
});

Deno.test("api-key: the test probes an endpoint that needs the key", async () => {
  const { ctx, calls } = mockCtx([users, { status: 200, body: { data: [] } }]);
  const result = await auth.test!({ credential } as never, ctx);
  assertEquals(calls[0].url, "https://api.lever.co/v1/users?limit=1");
  assertEquals(result.ok, true);
  assert(/Ada Lovelace/.test(result.message!), result.message);
});

/** Confidential access is granted only at key creation and never shows up later. */
Deno.test("api-key: the test reports whether the key can see confidential data", async () => {
  const can = mockCtx([users, { status: 200, body: { data: [] } }]);
  const withAccess = await auth.test!({ credential } as never, can.ctx);
  assertEquals(new URL(can.calls[1].url).searchParams.get("confidentiality"), "confidential");
  assert(/CAN read confidential data/.test(withAccess.message!), withAccess.message);

  const cannot = mockCtx([users, { status: 403, body: { message: "forbidden" } }]);
  const without = await auth.test!({ credential } as never, cannot.ctx);
  assertEquals(without.ok, true, "a key without it is still a working key");
  assert(/CANNOT read confidential data/.test(without.message!), without.message);
  assert(/silently omit confidential records/.test(without.message!), without.message);
});

Deno.test("api-key: the sandbox is probed on its own host", async () => {
  const { ctx, calls } = mockCtx([users, { status: 200, body: { data: [] } }]);
  const result = await auth.test!(
    { credential: { ...credential, environment: "sandbox" } } as never,
    ctx,
  );
  assertEquals(calls[0].url, "https://api.sandbox.lever.co/v1/users?limit=1");
  assert(/Lever sandbox/.test(result.message!), result.message);
});

Deno.test("api-key: a rejected key names the basic-auth shape", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { code: "UnauthorizedError", message: "no" } }]);
  const result = await auth.test!({ credential } as never, ctx);
  assertEquals(result.ok, false);
  assert(/BASIC AUTH USERNAME/.test(result.message!), result.message);
});

Deno.test("api-key: afterConnect records the environment and data centre, not the key", () => {
  const display = auth.afterConnect!({ credential }, mockCtx([]).ctx) as Record<string, unknown>;
  assertEquals(display.environment, "production");
  assertEquals(display.dataCenter, "global");
  assert(!JSON.stringify(display).includes("key123"), JSON.stringify(display));
});

/** Lever keys have no per-endpoint scope. */
Deno.test("api-key: the field hint says the key carries many privileges", () => {
  const field = auth.fields!.find((f) => f.key === "apiKey")!;
  assert(/no per-endpoint scope/.test(field.hint!), field.hint);
  assertEquals(auth.type, "basic");
});
