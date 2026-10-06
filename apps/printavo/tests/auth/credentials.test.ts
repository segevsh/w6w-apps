import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/credentials.ts";

const cred = { email: "a@shop.co", token: "tok" };

Deno.test("credentials: is `custom` with an email and a secret token field", () => {
  assertEquals(auth.type, "custom");
  assertEquals(auth.fields?.map((f) => f.key), ["email", "token"]);
  assertEquals(auth.fields![1].type, "secret");
  assert(auth.fields!.every((f) => f.required));
});

Deno.test("credentials: sign stamps the email and token headers", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://www.printavo.com/api/v2",
    method: "POST",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: cred }, ctx);
  assertEquals(out.headers["email"], "a@shop.co");
  assertEquals(out.headers["token"], "tok");
  assertEquals("authorization" in out.headers, false);
});

Deno.test("credentials: test refuses an incomplete credential without a request", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals(await auth.test({ credential: { email: "a@b.co" } }, ctx), {
    ok: false,
    message: "credential missing email or token",
  });
  assertEquals(calls.length, 0);
});

Deno.test("credentials: test passes when the session user resolves", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { user: { id: "1", name: "Ann" } } } }]);
  assertEquals(await auth.test({ credential: cred }, ctx), { ok: true });
  assertEquals(calls[0].headers["email"], "a@shop.co");
  assertEquals(calls[0].headers["token"], "tok");
  assertEquals(JSON.parse(calls[0].body!).query, "{ user { id name } }");
});

Deno.test("credentials: test classifies Unauthorized from the body, not the status", async () => {
  // Observed live: HTTP 200 with errors[0].extensions.code 403.
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      errors: [{ message: "Unauthorized", extensions: { code: 403 } }],
      data: null,
    },
  }]);
  assertEquals(await auth.test({ credential: cred }, ctx), {
    ok: false,
    message: "Printavo rejected the email/token (Unauthorized)",
  });
});

Deno.test("credentials: test relays other vendor errors and non-JSON bodies", async () => {
  const other = mockCtx([{ body: { errors: [{ message: "Internal error" }] } }]);
  assertEquals(await auth.test({ credential: cred }, other.ctx), {
    ok: false,
    message: "Internal error",
  });
  const html = mockCtx([{ status: 502, body: "<html>bad gateway</html>" }]);
  assertEquals(await auth.test({ credential: cred }, html.ctx), {
    ok: false,
    message: "Printavo returned HTTP 502 with no JSON body",
  });
  const empty = mockCtx([{ body: { data: { user: null } } }]);
  assertEquals((await auth.test({ credential: cred }, empty.ctx)).ok, false);
});

Deno.test("credentials: afterConnect labels with user and account, and tolerates failure", async () => {
  const { ctx } = mockCtx([{
    body: {
      data: { user: { id: "1", name: "Ann", account: { id: "9", companyName: "Ink Co" } } },
    },
  }]);
  assertEquals(await auth.afterConnect!({ credential: cred }, ctx), {
    user: { id: "1", name: "Ann" },
    account: { id: "9", companyName: "Ink Co" },
  });
  const bad = mockCtx([{ body: { errors: [{ message: "Unauthorized" }], data: null } }]);
  assertEquals(await auth.afterConnect!({ credential: cred }, bad.ctx), {});
  assertEquals(await auth.afterConnect!({ credential: {} }, bad.ctx), {});
});
