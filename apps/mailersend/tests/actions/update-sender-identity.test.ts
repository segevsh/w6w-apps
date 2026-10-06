import { assertEquals } from "@std/assert";
import action from "../../actions/update-sender-identity.ts";
import { bodyOf, exec, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("update-sender-identity: PUTs /v1/identities/{id} with changed fields only", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "i1" } } }]);
  await exec(action, { identityId: "i1", name: "New", replyToEmail: "r@x.com" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v1/identities/i1");
  assertEquals(bodyOf(calls[0]), { name: "New", reply_to_email: "r@x.com" });
});
