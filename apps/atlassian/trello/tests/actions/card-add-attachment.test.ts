import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/card-add-attachment.ts";

Deno.test("card-add-attachment: POSTs /cards/{id}/attachments with the URL", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "a1" } }]);
  await action.execute({ cardId: "c1", url: "https://example.test/spec.pdf" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/1/cards/c1/attachments");
  assertEquals(
    new URL(calls[0].url).searchParams.get("url"),
    "https://example.test/spec.pdf",
  );
});
