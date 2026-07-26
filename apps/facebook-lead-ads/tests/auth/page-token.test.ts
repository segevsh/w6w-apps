import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/page-token.ts";

Deno.test("page-token: is a bearer method collecting one secret field", () => {
  assertEquals(auth.key, "page-token");
  assertEquals(auth.type, "bearer");
  assertEquals(auth.fields?.length, 1);
  const field = auth.fields![0];
  assertEquals(field.key, "accessToken");
  assertEquals(field.type, "secret");
  assert(field.required);
});

Deno.test("page-token: sign injects the page token as a Bearer", async () => {
  const { ctx } = mockCtx();
  const request = { url: "https://x", method: "GET", headers: {} as Record<string, string> };
  const out = await auth.sign!({ request, credential: { accessToken: "page-tok-xyz" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer page-tok-xyz");
});

Deno.test("page-token: test rejects a credential with no token", async () => {
  const { ctx, calls } = mockCtx();
  const res = await auth.test({ credential: {} }, ctx);
  assertEquals(res, { ok: false, message: "credential missing accessToken" });
  assertEquals(calls.length, 0, "must not hit the network without a token");
});

Deno.test("page-token: test probes /me and reports the upstream status", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "1", name: "Acme Page" } }]);
  assertEquals(await auth.test({ credential: { accessToken: "t" } }, ctx), { ok: true });
  assertEquals(calls[0].url, "https://graph.facebook.com/v19.0/me?fields=id,name");

  const bad = mockCtx([{ status: 401, body: {} }]);
  assertEquals(await auth.test({ credential: { accessToken: "t" } }, bad.ctx), {
    ok: false,
    message: "Facebook returned 401",
  });
});

Deno.test("page-token: afterConnect labels the connection with the Page", async () => {
  const { ctx } = mockCtx([{ body: { id: "42", name: "Acme Page" } }]);
  assertEquals(await auth.afterConnect!({ credential: {} }, ctx), {
    page: { id: "42", name: "Acme Page" },
  });
});
