import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/embedded-edit-url-get.ts";
import signUrl from "../../actions/embedded-sign-url-get.ts";

/** Its sibling is a GET, which is easy to get backwards. */
Deno.test("edit-url: POSTs, unlike sign-url", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { embedded: { edit_url: "https://x" } } }]);
  await action.execute!({ templateId: "t1" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.hellosign.com/v3/embedded/edit_url/t1");

  const sign = mockCtx([{ status: 200, body: { embedded: {} } }]);
  await signUrl.execute!({ signatureId: "sg1" }, sign.ctx);
  assertEquals(sign.calls[0].method, "GET");
});

Deno.test("edit-url: editor options pass through as an object", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({
    templateId: "t1",
    editorOptions: '{"allow_edit_signers":true}',
    skipSignerRoles: true,
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.editor_options, { allow_edit_signers: true });
  assertEquals(body.skip_signer_roles, true);
});

Deno.test("edit-url: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`templateId`");
  assertEquals(calls.length, 0);
});
