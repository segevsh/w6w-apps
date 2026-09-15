import { assertEquals } from "@std/assert";
import templateCopy from "../../actions/template-copy.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("template-copy: POSTs /template/{id}/copy/{target}", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 8 } }]);
  const out = await templateCopy.execute(
    { templateId: "5", targetMailboxId: "77" },
    ctx,
  ) as { result: { id: number } };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/template/5/copy/77");
  assertEquals(out.result.id, 8);
});

Deno.test("template-copy: is not idempotent", () => {
  assertEquals(templateCopy.idempotent, false);
});
