import { assert, assertEquals, assertRejects } from "@std/assert";
import sendPostcard from "../../actions/send-postcard.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("send-postcard: calls POST /api/v2/send/postcard and shapes the output", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 42, "status": "reviewing" } }]);
  const out = await sendPostcard.execute(
    {
      "mailingListIds": "1, 2",
      "message": "Hi",
      "imageTemplateId": 9,
      "size": "6x9",
      "metadata": '{"deal":"D-1"}',
    } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/send/postcard");
  assertEquals(new URL(calls[0].url).origin, "https://api.thanks.io");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(JSON.parse(calls[0].body!), {
    "mailing_list_ids": [1, 2],
    "message": "Hi",
    "image_template_id": 9,
    "size": "6x9",
    "metadata": { "deal": "D-1" },
  });
  assert(out.orderId === 42 && out.status === "reviewing", JSON.stringify(out));
});

Deno.test("send-postcard: a vendor error surfaces the HTTP status and message", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: {
      "message": "The given data was invalid.",
      "errors": { "size": ["The selected size is invalid."] },
    },
  }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        sendPostcard.execute(
          {
            "mailingListIds": "1, 2",
            "message": "Hi",
            "imageTemplateId": 9,
            "size": "6x9",
            "metadata": '{"deal":"D-1"}',
          } as never,
          ctx,
        ),
      ),
    Error,
  );
  assert(
    err.message.includes("HTTP 422") && err.message.includes("selected size is invalid"),
    err.message,
  );
});

Deno.test("send-postcard: refuses an order with no audience before any network call", async () => {
  const { ctx, calls } = mockCtx([]);
  const bad = {
    "message": "Hi",
    "imageTemplateId": 9,
    "size": "6x9",
    "metadata": '{"deal":"D-1"}',
  };
  await assertRejects(
    () => Promise.resolve(sendPostcard.execute(bad as never, ctx)),
    Error,
    "no audience",
  );
  assertEquals(calls.length, 0);
});

Deno.test("send-postcard: is a non-idempotent perform whose description warns about spend", () => {
  assertEquals(sendPostcard.idempotent, false);
  assert(/real money/i.test(sendPostcard.description ?? ""));
});
