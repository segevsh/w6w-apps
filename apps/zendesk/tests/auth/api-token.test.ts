import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-token.ts";

Deno.test("api-token: collects the subdomain alongside the credential", () => {
  assertEquals(auth.key, "api-token");
  assertEquals(auth.type, "basic");
  const keys = auth.fields?.map((f) => f.key);
  // The subdomain identifies the ACCOUNT, so it belongs to the Connection
  // rather than being re-entered on every action.
  assertEquals(keys, ["subdomain", "email", "apiToken"]);
  assertEquals(auth.fields?.find((f) => f.key === "apiToken")?.type, "secret");
  assertEquals(auth.fields?.find((f) => f.key === "subdomain")?.type, "string");
});

Deno.test("api-token: sign uses Zendesk's `{email}/token` Basic username", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://acme.zendesk.com/api/v2/tickets.json",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!(
    { request, credential: { email: "jo@acme.test", apiToken: "tok" } },
    ctx,
  );
  // The `/token` suffix is what selects API-token auth over a password login.
  assertEquals(out.headers["authorization"], `Basic ${btoa("jo@acme.test/token:tok")}`);
});

Deno.test("api-token: test refuses a half-filled credential without a request", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals(await auth.test({ credential: { subdomain: "acme" } }, ctx), {
    ok: false,
    message: "credential missing subdomain, email or apiToken",
  });
  assertEquals(calls.length, 0);
});

Deno.test("api-token: test probes the account's own host", async () => {
  const ok = mockCtx([{ body: { user: { id: 1 } } }]);
  assertEquals(
    await auth.test({ credential: { subdomain: "acme", email: "a@b.c", apiToken: "t" } }, ok.ctx),
    { ok: true },
  );
  assertEquals(ok.calls[0].url, "https://acme.zendesk.com/api/v2/users/me.json");
});

Deno.test("api-token: afterConnect records the subdomain for the client to use", async () => {
  const { ctx } = mockCtx([{ body: { user: { id: 1, name: "Jo" } } }]);
  const out = await auth.afterConnect!({ credential: { subdomain: "acme" } }, ctx);
  assertEquals(out, { subdomain: "acme", user: { id: 1, name: "Jo" } });
});

Deno.test("api-token: afterConnect still records the subdomain if the probe fails", async () => {
  const { ctx } = mockCtx([{ status: 500, body: {} }]);
  const out = await auth.afterConnect!({ credential: { subdomain: "acme" } }, ctx);
  // Without this the client could never build a URL for the connection.
  assertEquals(out, { subdomain: "acme" });
  assert("subdomain" in out);
});
