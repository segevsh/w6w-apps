import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/unclaimed-draft-create.ts";

Deno.test("unclaimed-draft: a signature request draft demands signers", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await action.execute!({ type: "request_signature", fileUrls: "https://x/a.pdf" }, ctx),
    Error,
    "`signers` is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("unclaimed-draft: a send_document draft needs no signers", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { unclaimed_draft: { claim_url: "u" } } }]);
  const result = await action.execute!({
    type: "send_document",
    fileUrls: "https://x/a.pdf",
  }, ctx) as Record<string, unknown>;
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.type, "send_document");
  assertEquals(body.signers, undefined);
  assertEquals(result.claim_url, "u");
});

Deno.test("unclaimed-draft: test_mode is explicit here too", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({ type: "send_document", fileUrls: "https://x/a.pdf" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).test_mode, false);
});

Deno.test("unclaimed-draft: a document is required", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ type: "send_document" }, ctx),
    Error,
    "`fileUrls` is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("unclaimed-draft: creates a second draft on a retry, and says so", () => {
  assertEquals(action.idempotent, false);
});
