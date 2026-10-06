import { assert, assertEquals } from "@std/assert";
import type { HookContext, SignableRequest } from "@w6w/types";
import basic, { basicHeader, PROBE_PATH } from "../../auth/basic.ts";
import { loginErrorBody, mockCtx, pathOf } from "../_helpers.ts";

const CRED = { username: "api.user@example.com", password: "supersecretpassword" };

Deno.test("basic: sign stamps Basic base64(login:password) on the header, never the URL", () => {
  const request = { url: "https://www.gocanvas.com/api/v3/forms", method: "GET", headers: {} };
  const signed = basic.sign!(
    { request: request as unknown as SignableRequest, credential: CRED },
    {} as HookContext,
  ) as SignableRequest;
  assertEquals(
    signed.headers["authorization"],
    `Basic ${btoa("api.user@example.com:supersecretpassword")}`,
  );
  assertEquals(signed.url, "https://www.gocanvas.com/api/v3/forms");
});

Deno.test("basic: a non-Latin1 password is UTF-8 encoded instead of throwing", () => {
  const header = basicHeader({ username: "u", password: "pässwörd€" });
  const decoded = new TextDecoder().decode(
    Uint8Array.from(atob(header.slice("Basic ".length)), (c) => c.charCodeAt(0)),
  );
  assertEquals(decoded, "u:pässwörd€");
});

Deno.test("basic: the probe is GET /api/v3/me and carries the signed header", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 7, login: "api.user@example.com" } }]);
  const out = await basic.test({ credential: CRED }, ctx);
  assertEquals(out.ok, true);
  assertEquals(PROBE_PATH, "/me");
  assertEquals(calls.length, 1);
  assertEquals(pathOf(calls[0].url), "/api/v3/me");
  assertEquals(calls[0].headers["authorization"], basicHeader(CRED));
});

Deno.test("basic: a missing half fails without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const out = await basic.test({ credential: { username: "only-login" } }, ctx);
  assertEquals(out.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("basic: a 401 is reported with the vendor message and the missing-vs-wrong caveat", async () => {
  const { ctx } = mockCtx([{ status: 401, body: loginErrorBody() }]);
  const out = await basic.test({ credential: CRED }, ctx);
  assertEquals(out.ok, false);
  assert(out.message?.includes("must be logged in"), out.message);
  assert(out.message?.includes("look identical"), out.message);
});

Deno.test("basic: a 200 that is not a user profile is not a pass", async () => {
  const { ctx } = mockCtx([{
    body: "<html>login</html>",
    headers: { "content-type": "text/html" },
  }]);
  const out = await basic.test({ credential: CRED }, ctx);
  assertEquals(out.ok, false);
  assert(out.message?.includes("not the documented"), out.message);
});

Deno.test("basic: 403 and other statuses are failures with their own message", async () => {
  const a = await basic.test(
    { credential: CRED },
    mockCtx([{ status: 403, body: { error: "no" } }]).ctx,
  );
  assert(a.message?.includes("403"), a.message);
  const b = await basic.test({ credential: CRED }, mockCtx([{ status: 503, body: "down" }]).ctx);
  assert(b.message?.includes("503"), b.message);
});

Deno.test("basic: afterConnect labels the connection with the company name, silently on failure", async () => {
  const ok = mockCtx([{ body: { id: 1, company_name: "Acme Field Co" } }]);
  assertEquals(await basic.afterConnect!({ credential: CRED }, ok.ctx), {
    company: "Acme Field Co",
  });
  const bad = mockCtx([{ status: 401, body: loginErrorBody() }]);
  assertEquals(await basic.afterConnect!({ credential: CRED }, bad.ctx), {});
  assertEquals(await basic.afterConnect!({ credential: CRED }, mockCtx([]).ctx), {});
});

Deno.test("basic: both credential halves are secret fields", () => {
  const fields = basic.fields ?? [];
  assertEquals(fields.map((f) => f.key), ["username", "password"]);
  for (const f of fields) assertEquals(f.type, "secret");
});
