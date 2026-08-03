import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/basic.ts";

const CRED = { apiKey: "pub-key", secretKey: "priv-secret" };
const EXPECTED = `Basic ${btoa("pub-key:priv-secret")}`;

Deno.test("auth: declares HTTP Basic with both key halves", () => {
  assertEquals(auth.type, "basic");
  assertEquals(auth.fields?.map((f) => f.key), ["apiKey", "secretKey"]);
  assertEquals(auth.fields?.find((f) => f.key === "secretKey")?.type, "secret");
});

Deno.test("auth: sign builds base64(apiKey:secretKey) as the Basic credential", () => {
  const request = { headers: {} as Record<string, string> };
  const { ctx } = mockCtx([]);
  const signed = auth.sign!({ request, credential: CRED } as never, ctx) as typeof request;
  assertEquals(signed.headers["authorization"], EXPECTED);
  assertEquals(atob(signed.headers["authorization"].slice(6)), "pub-key:priv-secret");
});

Deno.test("auth: test probes contactslist with Limit=1", async () => {
  const { ctx, calls } = mockCtx([{ body: { Count: 0, Data: [] } }]);
  const result = await auth.test({ credential: CRED } as never, ctx);
  assertEquals(result.ok, true);
  const url = new URL(calls[0].url);
  assertEquals(url.host, "api.mailjet.com");
  assertEquals(url.pathname, "/v3/REST/contactslist");
  assertEquals(url.searchParams.get("Limit"), "1");
});

Deno.test("auth: test never calls /apikey — that endpoint returns SecretKey in plaintext", async () => {
  const { ctx, calls } = mockCtx([{ body: { Count: 0, Data: [] } }]);
  await auth.test({ credential: CRED } as never, ctx);
  for (const call of calls) {
    assert(!call.url.includes("/apikey"), `probe must not touch /apikey: ${call.url}`);
  }
});

Deno.test("auth: test signs its own probe (it runs before sign is wired up)", async () => {
  const { ctx, calls } = mockCtx([{ body: { Data: [] } }]);
  await auth.test({ credential: CRED } as never, ctx);
  assertEquals(calls[0].headers["authorization"], EXPECTED);
});

Deno.test("auth: test fails closed when either half is missing", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals(await auth.test({ credential: { apiKey: "k" } } as never, ctx), {
    ok: false,
    message: "credential missing apiKey or secretKey",
  });
  assertEquals(await auth.test({ credential: { secretKey: "s" } } as never, ctx), {
    ok: false,
    message: "credential missing apiKey or secretKey",
  });
  // Nothing should have gone over the wire.
  assertEquals(calls.length, 0);
});

Deno.test("auth: test reports a 401 without echoing the credential", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: "<html>Unauthorized</html>",
    headers: { "content-type": "text/html" },
  }]);
  const result = await auth.test({ credential: CRED } as never, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("401"), result.message);
  assert(!result.message?.includes("priv-secret"), "message leaked the secret key");
  assert(!result.message?.includes("pub-key"), "message leaked the API key");
});

Deno.test("auth: declares no afterConnect — no verified identity read exists without leaking keys", () => {
  assertEquals(auth.afterConnect, undefined);
  assertEquals(auth.connectionLabel, undefined);
});
