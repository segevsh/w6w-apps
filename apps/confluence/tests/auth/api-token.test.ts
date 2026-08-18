import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-token.ts";

Deno.test("api-token: signs with Atlassian Basic — email as the user, token as the password", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://acme.atlassian.net/wiki/api/v2/pages",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!(
    { request, credential: { email: "a@b.com", apiToken: "tok" } },
    ctx,
  );
  assertEquals(out.headers["authorization"], `Basic ${btoa("a@b.com:tok")}`);
});

Deno.test("api-token: the token is the only secret field, and the site is validated", () => {
  const secret = auth.fields!.filter((f) => f.type === "secret").map((f) => f.key);
  assertEquals(secret, ["apiToken"]);
  const site = auth.fields!.find((f) => f.key === "site")!;
  // A bare site name, not a URL — the pattern is what enforces that.
  assertEquals(site.validation?.pattern, "^[a-zA-Z0-9-]+$");
});

Deno.test("api-token: test probes v1's whoami, which v2 has no equivalent for", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { accountId: "acc1" } }]);
  const result = await auth.test!(
    { credential: { site: "acme", email: "a@b.com", apiToken: "tok" } } as never,
    ctx,
  );
  assertEquals(result, { ok: true });
  assertEquals(calls[0].url, "https://acme.atlassian.net/wiki/rest/api/user/current");
  assertEquals(calls[0].headers["authorization"], `Basic ${btoa("a@b.com:tok")}`);
});

Deno.test("api-token: 401 and 403 are different problems and say so", async () => {
  const bad = mockCtx([{ status: 401, body: "" }]);
  const a = await auth.test!(
    { credential: { site: "acme", email: "a@b.com", apiToken: "t" } } as never,
    bad.ctx,
  ) as { ok: boolean; message: string };
  assertEquals(a.ok, false);
  assert(a.message.includes("401"), a.message);

  const forbidden = mockCtx([{ status: 403, body: "" }]);
  const b = await auth.test!(
    { credential: { site: "acme", email: "a@b.com", apiToken: "t" } } as never,
    forbidden.ctx,
  ) as { ok: boolean; message: string };
  assertEquals(b.ok, false);
  assert(b.message.includes("Confluence"), b.message);
});

Deno.test("api-token: an incomplete credential fails before any network call", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals(await auth.test!({ credential: { site: "acme" } } as never, ctx), {
    ok: false,
    message: "credential missing site, email or apiToken",
  });
  assertEquals(calls.length, 0);
});

Deno.test("api-token: afterConnect records the site and user, never the token", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { accountId: "acc1", displayName: "Ann", email: "a@b.com" },
  }]);
  const display = await auth.afterConnect!(
    { credential: { site: "acme", email: "a@b.com", apiToken: "sup3rsecret" } } as never,
    ctx,
  ) as Record<string, unknown>;
  assertEquals(display.site, "acme");
  assertEquals((display.user as Record<string, unknown>).displayName, "Ann");
  assert(!JSON.stringify(display).includes("sup3rsecret"), "the credential leaked into display");
});

Deno.test("api-token: a failed whoami still records the site, so the client can build URLs", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  assertEquals(
    await auth.afterConnect!({ credential: { site: "acme" } } as never, ctx),
    { site: "acme" },
  );
});
