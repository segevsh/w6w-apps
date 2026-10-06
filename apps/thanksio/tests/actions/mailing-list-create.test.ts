import { assert, assertEquals, assertRejects } from "@std/assert";
import mailingListCreate from "../../actions/mailing-list-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("mailing-list-create: calls POST /api/v2/mailing-lists/ and shapes the output", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 8, "description": "VIPs", "type": "manual" } }]);
  const out = await mailingListCreate.execute(
    { "description": "VIPs", "qrcodeUrl": "https://x/q" } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/mailing-lists/");
  assertEquals(new URL(calls[0].url).origin, "https://api.thanks.io");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(JSON.parse(calls[0].body!), { "description": "VIPs", "qrcode_url": "https://x/q" });
  assert(out.id === 8, JSON.stringify(out));
});

Deno.test("mailing-list-create: a vendor error surfaces the HTTP status and message", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: { "message": "The description field is required." },
  }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        mailingListCreate.execute(
          { "description": "VIPs", "qrcodeUrl": "https://x/q" } as never,
          ctx,
        ),
      ),
    Error,
  );
  assert(
    err.message.includes("HTTP 422") && err.message.includes("description field is required"),
    err.message,
  );
});
