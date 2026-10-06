import { assert, assertEquals, assertRejects } from "@std/assert";
import sendWindowedLetter from "../../actions/send-windowed-letter.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("send-windowed-letter: calls POST /api/v2/send/windowedletter and shapes the output", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 42, "status": "reviewing" } }]);
  const out = await sendWindowedLetter.execute(
    {
      "mailingListIds": "5",
      "pdfOnlyUrl": "https://x/l.pdf",
      "additionalPagesUrl": "https://x/p.pdf",
    } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/send/windowedletter");
  assertEquals(new URL(calls[0].url).origin, "https://api.thanks.io");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(JSON.parse(calls[0].body!), {
    "mailing_list_ids": [5],
    "pdf_only_url": "https://x/l.pdf",
    "additional_pages_url": "https://x/p.pdf",
  });
  assert(out.orderId === 42, JSON.stringify(out));
});

Deno.test("send-windowed-letter: a vendor error surfaces the HTTP status and message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { "message": "Unauthenticated." } }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        sendWindowedLetter.execute(
          {
            "mailingListIds": "5",
            "pdfOnlyUrl": "https://x/l.pdf",
            "additionalPagesUrl": "https://x/p.pdf",
          } as never,
          ctx,
        ),
      ),
    Error,
  );
  assert(err.message.includes("HTTP 401") && err.message.includes("Unauthenticated"), err.message);
});

Deno.test("send-windowed-letter: refuses an order with no audience before any network call", async () => {
  const { ctx, calls } = mockCtx([]);
  const bad = { "pdfOnlyUrl": "https://x/l.pdf", "additionalPagesUrl": "https://x/p.pdf" };
  await assertRejects(
    () => Promise.resolve(sendWindowedLetter.execute(bad as never, ctx)),
    Error,
    "no audience",
  );
  assertEquals(calls.length, 0);
});

Deno.test("send-windowed-letter: is a non-idempotent perform whose description warns about spend", () => {
  assertEquals(sendWindowedLetter.idempotent, false);
  assert(/real money/i.test(sendWindowedLetter.description ?? ""));
});
