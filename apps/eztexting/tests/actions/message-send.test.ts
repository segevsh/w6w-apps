import { assertEquals, assertRejects } from "@std/assert";
import messageSend from "../../actions/message-send.ts";
import { API_ROOT, apiError, bodyOf, mockCtx } from "../_helpers.ts";

Deno.test("message-send: calls POST /messages and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "m1" } }]);
  const result = await messageSend.execute(
    {
      "toNumbers": ["2125551234", "2125559999"],
      "groupIds": "7,8",
      "message": "hello",
      "sendAt": "2026-12-03T10:15:30+00:00",
      "messageType": "SMS",
      "strictValidation": false,
    } as never,
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url.split("?")[0], `${API_ROOT}/messages`);
  assertEquals(bodyOf(calls[0]), {
    "message": "hello",
    "sendAt": "2026-12-03T10:15:30+00:00",
    "toNumbers": ["2125551234", "2125559999"],
    "groupIds": ["7", "8"],
    "messageType": "SMS",
    "strictValidation": false,
  });
  assertEquals(result, { "id": "m1" });
});

Deno.test("message-send: carries no credential — auth is the sign hook's job", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "m1" } }]);
  await messageSend.execute(
    {
      "toNumbers": ["2125551234", "2125559999"],
      "groupIds": "7,8",
      "message": "hello",
      "sendAt": "2026-12-03T10:15:30+00:00",
      "messageType": "SMS",
      "strictValidation": false,
    } as never,
    ctx,
  );
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("message-send: declared non-idempotent — a retry would text people twice", () => {
  assertEquals(messageSend.idempotent, false);
});

Deno.test("message-send: surfaces the vendor's 400 message, not a bare status", async () => {
  const { ctx } = mockCtx([{ status: 400, body: apiError(400, "Invalid phone number") }]);
  await assertRejects(
    async () => await messageSend.execute({ toNumbers: ["1"], message: "x" }, ctx),
    Error,
    "Invalid phone number",
  );
});
