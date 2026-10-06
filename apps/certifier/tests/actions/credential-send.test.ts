import { assertEquals } from "@std/assert";
import action from "../../actions/credential-send.ts";
import { CREDENTIAL, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("credential-send: POST /v1/credentials/{id}/send with deliveryMethod email", async () => {
  const { ctx, calls } = mockCtx([{ body: { ...CREDENTIAL, status: "issued" } }]);
  await action.execute({ credentialId: "c1" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/credentials/c1/send");
  assertEquals(JSON.parse(calls[0].body!), { deliveryMethod: "email" });
});

Deno.test("credential-send: is not idempotent, because every call emails the recipient", () => {
  assertEquals(action.idempotent, false);
});
