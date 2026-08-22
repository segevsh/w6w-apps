import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

Deno.test("api-key: signs as a bearer token, which is what the spec declares", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://app.loops.so/api/v1/api-key",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { apiKey: "k1" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer k1");
  assertEquals(auth.type, "bearer");
});

Deno.test("api-key: the key is a secret field with no default", () => {
  const secrets = auth.fields!.filter((f) => f.type === "secret").map((f) => f.key);
  assertEquals(secrets, ["apiKey"]);
  assertEquals(auth.fields!.find((f) => f.key === "apiKey")!.default, undefined);
});

/** Loops has exactly one key per workspace — worth saying, not leaving to a hunt. */
Deno.test("api-key: the description says there is no OAuth and no scoped key", () => {
  assert(auth.description!.includes("no OAuth"), auth.description);
});

Deno.test("api-key: test uses Loops' own key-test endpoint", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { success: true, teamName: "Acme" } }]);
  assertEquals(await auth.test!({ credential: { apiKey: "k1" } } as never, ctx), { ok: true });
  assertEquals(calls[0].url, "https://app.loops.so/api/v1/api-key");
  assertEquals(calls[0].headers["authorization"], "Bearer k1");
});

Deno.test("api-key: a rejected key says so, another status reports itself", async () => {
  const rejected = mockCtx([{ status: 401, body: { success: false, message: "Invalid API key" } }]);
  assertEquals(await auth.test!({ credential: { apiKey: "k" } } as never, rejected.ctx), {
    ok: false,
    message: "Loops rejected the API key (401)",
  });
  const other = mockCtx([{ status: 500, body: "" }]);
  assertEquals(await auth.test!({ credential: { apiKey: "k" } } as never, other.ctx), {
    ok: false,
    message: "Loops returned 500",
  });
});

Deno.test("api-key: a missing key fails before any network call", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals(await auth.test!({ credential: {} } as never, ctx), {
    ok: false,
    message: "credential missing apiKey",
  });
  assertEquals(calls.length, 0);
});

Deno.test("api-key: afterConnect publishes the workspace, never the key", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { success: true, teamName: "Acme" } }]);
  const display = await auth.afterConnect!(
    { credential: { apiKey: "supersecret" } } as never,
    ctx,
  ) as Record<string, unknown>;
  assertEquals(display, { teamName: "Acme" });
  assert(!JSON.stringify(display).includes("supersecret"), "the credential leaked into display");
});

Deno.test("api-key: a failed lookup still connects", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  assertEquals(await auth.afterConnect!({ credential: { apiKey: "k" } } as never, ctx), {});
});
