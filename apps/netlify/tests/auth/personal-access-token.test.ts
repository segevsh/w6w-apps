import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/personal-access-token.ts";

Deno.test("personal-access-token: sign injects a Bearer header", async () => {
  const request = { url: "https://api.netlify.com/api/v1/sites", method: "GET", headers: {} };
  const signed = await auth.sign!({ request, credential: { accessToken: "nf-secret" } }, {
    fetch: () => {
      throw new Error("sign must not call fetch");
    },
    log: () => {},
  });
  assertEquals(signed.headers["authorization"], "Bearer nf-secret");
});

Deno.test("personal-access-token: test passes on a 200 from /user", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { id: "u1", email: "a@b.com" } }]);
  const result = await auth.test({ credential: { accessToken: "nf-secret" } }, ctx);
  assertEquals(result, { ok: true });
});

Deno.test("personal-access-token: test fails on a non-2xx response", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { code: 1, message: "Invalid access token" } }]);
  const result = await auth.test({ credential: { accessToken: "bad" } }, ctx);
  assertEquals(result.ok, false);
});
