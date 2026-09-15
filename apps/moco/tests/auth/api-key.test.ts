import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

Deno.test("api-key: collects the account subdomain alongside the credential", () => {
  assertEquals(auth.key, "api-key");
  assertEquals(auth.type, "apiKey");
  const keys = auth.fields?.map((f) => f.key);
  // The account subdomain identifies the ACCOUNT, so it belongs to the Connection rather than
  // being re-entered on every action.
  assertEquals(keys, ["account", "apiKey"]);
  assertEquals(auth.fields?.find((f) => f.key === "apiKey")?.type, "secret");
  assertEquals(auth.fields?.find((f) => f.key === "account")?.type, "string");
});

Deno.test("api-key: declares MOCO's `Token token=` header shape", () => {
  assertEquals(auth.apiKey, { in: "header", name: "Authorization", prefix: "Token token=" });
});

Deno.test("api-key: sign stamps `Authorization: Token token=...`", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://acme.mocoapp.com/api/v1/projects",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { apiKey: "tok" } }, ctx);
  assertEquals(out.headers["authorization"], "Token token=tok");
});

Deno.test("api-key: test refuses a half-filled credential without a request", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals(await auth.test({ credential: { account: "acme" } }, ctx), {
    ok: false,
    message: "credential missing apiKey",
  });
  assertEquals(calls.length, 0);
});

Deno.test("api-key: test passes on a valid key", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, uuid: "abc" } }]);
  assertEquals(await auth.test({ credential: { account: "acme", apiKey: "tok" } }, ctx), {
    ok: true,
  });
  assertEquals(calls[0].url, "https://acme.mocoapp.com/api/v1/session");
  assertEquals(calls[0].headers["authorization"], "Token token=tok");
});

Deno.test("api-key: test reports a bad key distinctly from a bad subdomain", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { message: "Invalid API key." } }]);
  const out = await auth.test({ credential: { account: "acme", apiKey: "bad" } }, ctx);
  assertEquals(out.ok, false);
  assertEquals(/rejected the API key/.test(out.message ?? ""), true);
});

Deno.test("api-key: test reports a nonexistent subdomain distinctly from a bad key", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { message: "Subdomain does not exist." } }]);
  const out = await auth.test({ credential: { account: "ghost", apiKey: "tok" } }, ctx);
  assertEquals(out.ok, false);
  assertEquals(/no such account/.test(out.message ?? ""), true);
});

Deno.test("api-key: afterConnect records only the account subdomain, never the key", async () => {
  const out = await auth.afterConnect!(
    { credential: { account: "acme", apiKey: "tok" } },
    {} as never,
  );
  assertEquals(out, { account: "acme" });
});
