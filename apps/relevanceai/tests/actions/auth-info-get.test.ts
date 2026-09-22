import { assert, assertEquals } from "@std/assert";
import authInfoGet from "../../actions/auth-info-get.ts";
import { authInfo, mockRelevanceCtx, pathOf } from "../_helpers.ts";

Deno.test("auth-info-get: GETs /auth/info with no parameters at all", async () => {
  const { ctx, calls } = mockRelevanceCtx([{ body: authInfo() }]);
  const out = await authInfoGet.execute({}, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/latest/auth/info");
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url).includes("?"), false);
  assertEquals(out.user_id, "user-1");
  assertEquals(out.key_id, "key-1");
  assertEquals(out.permissions, { project: { "proj-1": "owner" } });
});

Deno.test("auth-info-get: declares no params, because the Connection is the whole input", () => {
  assertEquals(authInfoGet.params, []);
  assertEquals(authInfoGet.type, "read");
  assertEquals(authInfoGet.resource, "account");
});

Deno.test("auth-info-get: the answer it reports carries no credential", async () => {
  const { ctx } = mockRelevanceCtx([{ body: authInfo() }]);
  const out = await authInfoGet.execute({}, ctx) as Record<string, unknown>;
  for (const field of Object.keys(out)) {
    assert(
      !/secret|password|token|api[_-]?key|credential/i.test(field),
      `whoami returned a credential-shaped field: ${field}`,
    );
  }
});
