import { assertEquals } from "@std/assert";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";
import credentialList from "../../actions/credential-list.ts";

Deno.test("credential-list: query mapping, wraps the array", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ credential_id: "cred_1", name: "Gmail" }] }]);
  const out = await credentialList.execute({
    page: 1,
    pageSize: 10,
    vaultType: "bitwarden",
    credentialType: "password",
    search: "gm",
  }, ctx);
  assertEquals((out as { count: number }).count, 1);
  assertEquals(pathOf(calls[0].url), "/v1/credentials");
  assertEquals(queryOf(calls[0].url), {
    page: "1",
    page_size: "10",
    vault_type: "bitwarden",
    credential_type: "password",
    search: "gm",
  });
});
