import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import credentialGet from "../../actions/credential-get.ts";

const HOST = "https://api.skyvern.com";

Deno.test("credential-get: GETs /v1/credentials/{id} and returns the vendor body unchanged", async () => {
  const c = {
    credential_id: "cred_1",
    name: "Gmail",
    credential_type: "password",
    credential: { username: "me@x.co", has_totp: true },
  };
  const { ctx, calls } = mockCtx([{ body: c }]);
  const out = await credentialGet.execute({ credentialId: "cred_1" }, ctx);
  assertEquals(out, c);
  assert(!JSON.stringify(out).includes('password":'), "no secret field is added");
  assertEquals(calls[0].url, `${HOST}/v1/credentials/cred_1`);
});
