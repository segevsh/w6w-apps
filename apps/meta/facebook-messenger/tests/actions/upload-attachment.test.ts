import { assertEquals, assertRejects } from "@std/assert";
import { bodyOf, mockCtx } from "../_helpers.ts";
import action from "../../actions/upload-attachment.ts";

Deno.test("upload-attachment: POSTs /me/message_attachments with is_reusable", async () => {
  const { ctx, calls } = mockCtx([{ body: { attachment_id: "1857777774821032" } }]);
  const out = await action.execute!({ type: "image", url: "http://x/image.jpg" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v26.0/me/message_attachments");
  assertEquals(bodyOf(calls[0]), {
    message: {
      attachment: { type: "image", payload: { url: "http://x/image.jpg", is_reusable: true } },
    },
  });
  assertEquals(out, { attachment_id: "1857777774821032" });
});

Deno.test("upload-attachment: url required; Graph failure (2018008) surfaces", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { error: { message: "Failed to fetch the file", code: 100, error_subcode: 2018008 } },
  }]);
  await assertRejects(
    async () => await action.execute!({ type: "image", url: "" }, ctx),
    Error,
    "url",
  );
  await assertRejects(
    async () => await action.execute!({ type: "image", url: "http://x" }, ctx),
    Error,
    "2018008",
  );
});
