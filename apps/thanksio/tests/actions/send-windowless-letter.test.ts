import { assert, assertEquals, assertRejects } from "@std/assert";
import sendWindowlessLetter from "../../actions/send-windowless-letter.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("send-windowless-letter: calls POST /api/v2/send/windowlessletter and shapes the output", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 42, "status": "reviewing" } }]);
  const out = await sendWindowlessLetter.execute(
    {
      "mailingListIds": "5",
      "message": "Dear %FIRST_NAME%",
      "extra": '{"schedule_for":"2026-12-01"}',
    } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/send/windowlessletter");
  assertEquals(new URL(calls[0].url).origin, "https://api.thanks.io");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(JSON.parse(calls[0].body!), {
    "mailing_list_ids": [5],
    "message": "Dear %FIRST_NAME%",
    "schedule_for": "2026-12-01",
  });
  assert(out.orderId === 42, JSON.stringify(out));
});

Deno.test("send-windowless-letter: a vendor error surfaces the HTTP status and message", async () => {
  const { ctx } = mockCtx([{ status: 422, body: { "message": "x" } }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        sendWindowlessLetter.execute(
          {
            "mailingListIds": "5",
            "message": "Dear %FIRST_NAME%",
            "extra": '{"schedule_for":"2026-12-01"}',
          } as never,
          ctx,
        ),
      ),
    Error,
  );
  assert(err.message.includes("HTTP 422") && err.message.includes("HTTP 422"), err.message);
});

Deno.test("send-windowless-letter: refuses an order with no audience before any network call", async () => {
  const { ctx, calls } = mockCtx([]);
  const bad = { "message": "Dear %FIRST_NAME%", "extra": '{"schedule_for":"2026-12-01"}' };
  await assertRejects(
    () => Promise.resolve(sendWindowlessLetter.execute(bad as never, ctx)),
    Error,
    "no audience",
  );
  assertEquals(calls.length, 0);
});

Deno.test("send-windowless-letter: is a non-idempotent perform whose description warns about spend", () => {
  assertEquals(sendWindowlessLetter.idempotent, false);
  assert(/real money/i.test(sendWindowlessLetter.description ?? ""));
});
