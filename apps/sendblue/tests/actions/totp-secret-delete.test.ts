import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import totpSecretDelete from "../../actions/totp-secret-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("totp-secret-delete: DELETEs /api/v2/totp/secrets/{secret_id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "OK" } }]);
  await totpSecretDelete.execute({ secretId: "sec1" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/v2/totp/secrets/sec1");
});
