import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/connect-token.ts";

const cred = { url: "https://op.example.com", token: "op-token" };

Deno.test("connect-token: signs as a bearer", () => {
  const request = {
    url: "https://op.example.com/v1/vaults",
    headers: {} as Record<string, string>,
  };
  const signed = auth.sign!(
    { request, credential: cred } as never,
    mockCtx([]).ctx,
  ) as typeof request;
  assertEquals(signed.headers["authorization"], "Bearer op-token");
  assertEquals(auth.type, "bearer");
});

Deno.test("connect-token: the test reports how much the token can reach", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ id: "v1" }, { id: "v2" }] }]);
  const result = await auth.test!({ credential: cred } as never, ctx);
  assertEquals(calls[0].url, "https://op.example.com/v1/vaults");
  assertEquals(result.ok, true);
  assert(/2 vaults/.test(result.message!), result.message);
});

/** A vault name describes what is in it, so only the count is reported. */
Deno.test("connect-token: the test never names a vault", async () => {
  const { ctx } = mockCtx([{ status: 200, body: [{ id: "v1", name: "Production secrets" }] }]);
  const result = await auth.test!({ credential: cred } as never, ctx);
  assert(!result.message!.includes("Production"), result.message);
});

/** A token scoped to nothing is not a working connection. */
Deno.test("connect-token: a token scoped to no vaults fails the test", async () => {
  const { ctx } = mockCtx([{ status: 200, body: [] }]);
  const result = await auth.test!({ credential: cred } as never, ctx);
  assertEquals(result.ok, false);
  assert(/scoped to no vaults/.test(result.message!), result.message);
});

/** Connect runs beside whatever uses it, and often nowhere a runner can see. */
Deno.test("connect-token: an unreachable private address is explained, not timed out", async () => {
  for (
    const url of [
      "http://onepassword-connect:8080",
      "http://localhost:8080",
      "http://10.0.0.4:8080",
      "http://192.168.1.5:8080",
    ]
  ) {
    const ctx = {
      fetch: () => Promise.reject(new Error("ECONNREFUSED")),
      log: () => {},
    } as unknown as Parameters<NonNullable<typeof auth.test>>[1];
    const result = await auth.test!({ credential: { ...cred, url } } as never, ctx);
    assertEquals(result.ok, false);
    assert(/private or container-internal/.test(result.message!), `${url}: ${result.message}`);
  }
});

Deno.test("connect-token: a rejected token explains the Connect-specific causes", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { message: "Invalid token" } }]);
  const result = await auth.test!({ credential: cred } as never, ctx);
  assertEquals(result.ok, false);
  assert(/issued per Connect server/.test(result.message!), result.message);
});

Deno.test("connect-token: a non-JSON body is named as a proxy", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "<html/>" }]);
  const result = await auth.test!({ credential: cred } as never, ctx);
  assertEquals(result.ok, false);
  assert(/proxy or a different service/.test(result.message!), result.message);
});

Deno.test("connect-token: missing fields fail before any request", async () => {
  for (const credential of [{ token: "x" }, { url: "https://x.com" }]) {
    const { ctx, calls } = mockCtx([]);
    assertEquals((await auth.test!({ credential } as never, ctx)).ok, false);
    assertEquals(calls.length, 0);
  }
});

/** The scope at connect time is what the `surface` check compares against. */
Deno.test("connect-token: afterConnect records the surface and the vault count", async () => {
  const { ctx } = mockCtx([{ status: 200, body: [{ id: "v1" }, { id: "v2" }, { id: "v3" }] }]);
  const display = await auth.afterConnect!({ credential: cred }, ctx) as Record<string, unknown>;
  assertEquals(display.surface, "connect");
  assertEquals(display.vaultCount, 3);
  assertEquals(display.host, "op.example.com");
});

Deno.test("connect-token: afterConnect still records the surface when the call fails", async () => {
  const { ctx } = mockCtx([{ status: 500, body: {} }]);
  const display = await auth.afterConnect!({ credential: cred }, ctx) as Record<string, unknown>;
  assertEquals(display.surface, "connect");
});

/** This is the most powerful credential in the pack, and the hint says so. */
Deno.test("connect-token: the hints state the scope model", () => {
  const token = auth.fields!.find((f) => f.key === "token")!;
  assert(/separate token per integration/.test(token.hint!), token.hint);
  assert(/cannot be widened/.test(token.hint!), token.hint);
  assertEquals(token.type, "secret");
  assert(/read every secret/.test(auth.description!), auth.description);
});
