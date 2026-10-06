import { assert, assertEquals } from "@std/assert";
import basic from "../../auth/basic.ts";
import { mockCtx } from "../_helpers.ts";

const credential = { authId: "MAABC", authToken: "tok-secret" };
const sign = basic.sign!;

Deno.test("basic: sign stamps Basic base64(authId:authToken)", () => {
  const req = sign(
    {
      request: { url: "https://api.plivo.com/v1/Account/MAABC/", method: "GET", headers: {} },
      credential,
    } as never,
    mockCtx().ctx,
  ) as { headers: Record<string, string> };
  assertEquals(req.headers["authorization"], `Basic ${btoa("MAABC:tok-secret")}`);
});

Deno.test("basic: the token field is a secret, the Auth ID is not", () => {
  const byKey = Object.fromEntries(basic.fields!.map((f) => [f.key, f]));
  assertEquals(byKey.authToken.type, "secret");
  assertEquals(byKey.authId.type, "string");
});

Deno.test("basic: afterConnect publishes only the Auth ID", async () => {
  const out = await basic.afterConnect!({ credential } as never, mockCtx().ctx);
  assertEquals(out, { authId: "MAABC" });
  assert(!JSON.stringify(out).includes("tok-secret"));
});

Deno.test("basic: test passes on an account document for this Auth ID", async () => {
  const { ctx, calls } = mockCtx([{ body: { api_id: "x", auth_id: "MAABC", name: "Bruce" } }]);
  const res = await basic.test({ credential } as never, ctx);
  assertEquals(res, { ok: true });
  assertEquals(calls[0].url, "https://api.plivo.com/v1/Account/MAABC/");
  assertEquals(calls[0].headers["authorization"], `Basic ${btoa("MAABC:tok-secret")}`);
});

Deno.test("basic: a plain-text 401 is a rejection, whatever its status text", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body:
      "Could not verify your access level for that URL.\nYou have to login with proper credentials",
    headers: { "content-type": "text/html" },
  }]);
  const res = await basic.test({ credential } as never, ctx);
  assertEquals(res.ok, false);
  assert(res.message?.includes("rejected"));
});

Deno.test("basic: a 200 that is not this account's document does not pass", async () => {
  for (
    const body of [
      "<html>captive portal</html>",
      { api_id: "x", auth_id: "MAOTHER" },
      { api_id: "x" },
    ]
  ) {
    const { ctx } = mockCtx([{ status: 200, body }]);
    assertEquals((await basic.test({ credential } as never, ctx)).ok, false);
  }
});

Deno.test("basic: other failures name the status and never echo the token", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "boom" }]);
  const res = await basic.test({ credential } as never, ctx);
  assertEquals(res.ok, false);
  assert(res.message?.includes("500"));
  assert(!res.message?.includes("tok-secret"));
});
