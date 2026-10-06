import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/credential-issue.ts";
import { CREDENTIAL, errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("credential-issue: POST /v1/credentials/{id}/issue with no body", async () => {
  const { ctx, calls } = mockCtx([{ body: { ...CREDENTIAL, status: "issued" } }]);
  const out = await action.execute({ credentialId: "c1" }, ctx) as { status: string };
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/credentials/c1/issue");
  assertEquals(calls[0].body, null);
  assertEquals(out.status, "issued");
});

Deno.test("credential-issue: a non-draft credential's 412 surfaces with its code", async () => {
  const { ctx } = mockCtx([{ status: 412, body: errorBody("precondition_failed", "not a draft") }]);
  await assertRejects(
    async () => await action.execute({ credentialId: "c1" }, ctx),
    Error,
    "412 precondition_failed",
  );
});
