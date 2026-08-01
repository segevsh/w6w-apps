import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

Deno.test("api-key: collects the domain alongside the credential", () => {
  assertEquals(auth.key, "api-key");
  assertEquals(auth.type, "basic");
  const keys = auth.fields?.map((f) => f.key);
  // The domain identifies the ACCOUNT, so it belongs to the Connection rather
  // than being re-entered on every action.
  assertEquals(keys, ["domain", "apiKey"]);
  assertEquals(auth.fields?.find((f) => f.key === "apiKey")?.type, "secret");
  assertEquals(auth.fields?.find((f) => f.key === "domain")?.type, "string");
});

Deno.test("api-key: sign uses Freshdesk's `apiKey:X` Basic scheme", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://acme.freshdesk.com/api/v2/tickets",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { apiKey: "tok" } }, ctx);
  // "X" is the literal password Freshdesk's Basic-auth parser expects — not a
  // real password.
  assertEquals(out.headers["authorization"], `Basic ${btoa("tok:X")}`);
});

Deno.test("api-key: test refuses a half-filled credential without a request", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals(await auth.test({ credential: { domain: "acme" } }, ctx), {
    ok: false,
    message: "credential missing domain or apiKey",
  });
  assertEquals(calls.length, 0);
});

Deno.test("api-key: test probes the account's own host, signed itself", async () => {
  const ok = mockCtx([{ body: { id: 1 } }]);
  assertEquals(
    await auth.test({ credential: { domain: "acme", apiKey: "tok" } }, ok.ctx),
    { ok: true },
  );
  assertEquals(ok.calls[0].url, "https://acme.freshdesk.com/api/v2/agents/me");
  assertEquals(ok.calls[0].headers["authorization"], `Basic ${btoa("tok:X")}`);
});

Deno.test("api-key: afterConnect records the domain and the agent for the client to use", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, contact: { name: "Jo" } } }]);
  const out = await auth.afterConnect!({ credential: { domain: "acme", apiKey: "tok" } }, ctx);
  assertEquals(out, { domain: "acme", agent: { id: 1, contact: { name: "Jo" } } });
  // afterConnect gets an unsigned ctx.fetch (see hook-runtime.md) — it must
  // sign itself exactly like `test` does.
  assertEquals(calls[0].headers["authorization"], `Basic ${btoa("tok:X")}`);
});

Deno.test("api-key: afterConnect still records the domain if the probe fails", async () => {
  const { ctx } = mockCtx([{ status: 500, body: {} }]);
  const out = await auth.afterConnect!({ credential: { domain: "acme", apiKey: "tok" } }, ctx);
  // Without this the client could never build a URL for the connection.
  assertEquals(out, { domain: "acme" });
});
