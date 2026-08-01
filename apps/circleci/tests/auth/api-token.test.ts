import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-token.ts";

Deno.test("api-token: sign injects a Circle-Token header, no prefix", async () => {
  const request = { url: "https://circleci.com/api/v2/me", method: "GET", headers: {} };
  const signed = await auth.sign!({ request, credential: { token: "cci-secret" } }, {
    fetch: () => {
      throw new Error("sign must not call fetch");
    },
    log: () => {},
  });
  assertEquals(signed.headers["circle-token"], "cci-secret");
});

Deno.test("api-token: test passes on a 200 from /me", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { id: "u1", login: "alice" } }]);
  const result = await auth.test({ credential: { token: "cci-secret" } }, ctx);
  assertEquals(result, { ok: true });
});

Deno.test("api-token: test fails on a non-2xx response", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { message: "Invalid token" } }]);
  const result = await auth.test({ credential: { token: "bad" } }, ctx);
  assertEquals(result.ok, false);
});
