import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/send-draft.ts";

Deno.test("send-draft: POSTs to the draft's /send with no request body", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: undefined }]);
  const out = await action.execute({ messageId: "d1" }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/messages/d1/send");
  assertEquals(calls[0].method, "POST");
  // Graph documents this endpoint as taking no body, so none is sent — which is
  // also what produces the `Content-Length: 0` it asks for.
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers["content-type"], undefined);
  assertEquals(out, { status: 202 });
});

Deno.test("send-draft: encodes the draft id", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: undefined }]);
  await action.execute({ messageId: "AAMk/AAA=" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/messages/AAMk%2FAAA%3D/send");
});
