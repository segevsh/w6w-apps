import { assert, assertEquals, assertRejects } from "@std/assert";
import listWebhookConfigure from "../../actions/list-webhook-configure.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("list-webhook-configure: POST /api/1/configListWebhook/ with the documented form fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: 123 }]);
  const out = await listWebhookConfigure.execute(
    {
      "list_id": 7,
      "callback_url": "https://example.com/hook",
      "subscribes": true,
      "unsubscribes": true,
      "hard_bounce": false,
      "soft_bounce": false,
      "complain": true,
      "opens": false,
      "click": true,
      "active": true,
    } as never,
    ctx,
  );

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/1/configListWebhook/");
  assert(calls[0].url.startsWith("https://acumbamail.com/"));
  assertEquals(formOf(calls[0]), {
    "list_id": "7",
    "callback_url": "https://example.com/hook",
    "subscribes": "1",
    "unsubscribes": "1",
    "hard_bounce": "0",
    "soft_bounce": "0",
    "complain": "1",
    "opens": "0",
    "click": "1",
    "active": "1",
  });
  // the credential is stamped by `sign`, never by the action
  assert(!(calls[0].body ?? "").includes("auth_token"));
  assertEquals(out, { id: "123" });
});

Deno.test("list-webhook-configure: a vendor error surfaces its status and body", async () => {
  const { ctx } = mockCtx([{ status: 400, body: "Invalid argument" }]);
  const err = await assertRejects(async () =>
    await listWebhookConfigure.execute(
      {
        "list_id": 7,
        "callback_url": "https://example.com/hook",
        "subscribes": true,
        "unsubscribes": true,
        "hard_bounce": false,
        "soft_bounce": false,
        "complain": true,
        "opens": false,
        "click": true,
        "active": true,
      } as never,
      ctx,
    )
  );
  assert(String((err as Error).message).includes("(400)"));
  assert(String((err as Error).message).includes("Invalid argument"));
});

Deno.test("list-webhook-configure: an empty list_id fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await listWebhookConfigure.execute(
        {
          "list_id": "  ",
          "callback_url": "https://example.com/hook",
          "subscribes": true,
          "unsubscribes": true,
          "hard_bounce": false,
          "soft_bounce": false,
          "complain": true,
          "opens": false,
          "click": true,
          "active": true,
        } as never,
        ctx,
      ),
    Error,
    "list_id is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("list-webhook-configure: unset optional fields are not sent", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: 123 }]);
  await listWebhookConfigure.execute(
    { "list_id": 7, "callback_url": "https://example.com/hook" } as never,
    ctx,
  );
  assertEquals(formOf(calls[0]), { "list_id": "7", "callback_url": "https://example.com/hook" });
});
