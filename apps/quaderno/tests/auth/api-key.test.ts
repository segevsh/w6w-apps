import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

Deno.test("api-key: collects the account alongside the credential", () => {
  assertEquals(auth.key, "api-key");
  assertEquals(auth.type, "basic");
  assertEquals(auth.fields?.map((f) => f.key), ["account", "apiKey"]);
  assertEquals(auth.fields?.find((f) => f.key === "apiKey")?.type, "secret");
});

Deno.test("api-key: sign uses the key as Basic username with a blank password", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://acme.quadernoapp.com/api/contacts",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { apiKey: "sk_123" } }, ctx);
  assertEquals(out.headers["authorization"], `Basic ${btoa("sk_123:")}`);
});

Deno.test("api-key: test refuses a half-filled credential without a request", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals(await auth.test({ credential: { account: "acme" } }, ctx), {
    ok: false,
    message: "credential missing account or apiKey",
  });
  assertEquals(calls.length, 0);
});

Deno.test("api-key: test pings the account host, signing itself", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "ok" } }]);
  assertEquals(await auth.test({ credential: { account: "acme", apiKey: "k" } }, ctx), {
    ok: true,
  });
  assertEquals(calls[0].url, "https://acme.quadernoapp.com/api/ping");
  assertEquals(calls[0].headers["authorization"], `Basic ${btoa("k:")}`);
});

Deno.test("api-key: test classifies a rejection from the body's error", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { error: "Wrong API key or the user does not exist." },
  }]);
  assertEquals(await auth.test({ credential: { account: "acme", apiKey: "bad" } }, ctx), {
    ok: false,
    message: "Wrong API key or the user does not exist.",
  });
});

Deno.test("api-key: a 200 that is not the documented shape is not a pass", async () => {
  const { ctx } = mockCtx([{ body: "<html>shell</html>" }]);
  const out = await auth.test({ credential: { account: "acme", apiKey: "k" } }, ctx);
  assertEquals(out.ok, false);
});

Deno.test("api-key: afterConnect records the account", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals(await auth.afterConnect!({ credential: { account: "acme", apiKey: "k" } }, ctx), {
    account: "acme",
  });
  assertEquals(calls.length, 0);
});
