import { assert, assertEquals } from "@std/assert";
import oauth2 from "../../auth/oauth2.ts";
import { mockCtx } from "../_helpers.ts";

const credential = { accessToken: "tok-1" };
const err = (code: number, message = "m") => ({
  ErrorInformation: { Error: 1, Message: message, Code: code },
});

Deno.test("sign: stamps the bearer token and JSON accept header", () => {
  const request = {
    url: "https://api.fortnox.se/3/me",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = oauth2.sign!({ request, credential } as never, {} as never) as typeof request;
  assertEquals(out.headers["authorization"], "Bearer tok-1");
  assertEquals(out.headers["accept"], "application/json");
});

Deno.test("config: scopes cover the resource families the actions use", () => {
  const scopes = oauth2.oauth2!.scopes!;
  for (
    const s of [
      "companyinformation",
      "profile",
      "customer",
      "supplier",
      "article",
      "invoice",
      "order",
      "offer",
      "supplierinvoice",
      "bookkeeping",
      "payment",
      "project",
      "costcenter",
    ]
  ) assert(scopes.includes(s), s);
  assert(!scopes.includes("developerapi"), "developerapi is the partner API, not this app's");
  assertEquals(oauth2.oauth2!.pkce, true);
});

Deno.test("test: a company-information body is ok, and the probe hits /3/companyinformation", async () => {
  const { ctx, calls } = mockCtx([{ body: { CompanyInformation: { CompanyName: "Acme AB" } } }]);
  assertEquals(await oauth2.test({ credential } as never, ctx), { ok: true });
  assertEquals(new URL(calls[0].url).pathname, "/3/companyinformation");
  assertEquals(calls[0].headers["authorization"], "Bearer tok-1");
});

Deno.test("test: missing accessToken fails without a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const r = await oauth2.test({ credential: {} } as never, ctx);
  assertEquals(r.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("test: documented invalid-token codes fail, whatever status carries them", async () => {
  for (const [status, code] of [[401, 2000310], [400, 2000311], [403, 2003275], [200, 2000310]]) {
    const { ctx } = mockCtx([{ status, body: err(code, "Ogiltig inloggning") }]);
    const r = await oauth2.test({ credential } as never, ctx);
    assertEquals(r.ok, false, `${status}/${code}`);
    assertEquals(r.message, "Ogiltig inloggning");
  }
});

Deno.test("test: a scope or licence error proves the token is valid", async () => {
  for (const code of [2000663, 2001101]) {
    const { ctx } = mockCtx([{ status: 403, body: err(code, "Saknar scope") }]);
    const r = await oauth2.test({ credential } as never, ctx);
    assertEquals(r.ok, true, String(code));
    assert(r.message?.includes("Saknar scope"));
  }
});

Deno.test("test: an unrecognised failure and a body without company data both fail", async () => {
  const a = mockCtx([{ status: 500, body: err(1000003, "System exception") }]);
  assertEquals((await oauth2.test({ credential } as never, a.ctx)).ok, false);
  const b = mockCtx([{ status: 500, body: "oops", headers: {} }]);
  assertEquals((await oauth2.test({ credential } as never, b.ctx)).message, "Fortnox returned 500");
  const c = mockCtx([{ body: { Something: 1 } }]);
  assertEquals((await oauth2.test({ credential } as never, c.ctx)).ok, false);
});

Deno.test("afterConnect: labels the connection with the company name", async () => {
  const { ctx } = mockCtx([{
    body: { CompanyInformation: { CompanyName: "Acme AB", OrganizationNumber: "556000-0000" } },
  }]);
  assertEquals(await oauth2.afterConnect!({} as never, ctx), {
    company: { name: "Acme AB", organizationNumber: "556000-0000" },
  });
  const failing = mockCtx([{ status: 403, body: err(2000663) }]);
  assertEquals(await oauth2.afterConnect!({} as never, failing.ctx), {});
});
