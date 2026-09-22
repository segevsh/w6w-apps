import { assert, assertEquals, assertRejects } from "@std/assert";
import messageSend from "../../actions/message-send.ts";
import { API_ROOT, bodyOf, mockCtx } from "../_helpers.ts";

const SENT = { id: "507f191e810c19729de860ea", credits: 1 };

Deno.test("message-send: POSTs the required trio and returns the id and credits", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: SENT }]);
  const result = await messageSend.execute(
    { contactPhone: "1234567890", mode: "AUTO", text: "Hello!" },
    ctx,
  ) as { id: string; credits: number };

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, `${API_ROOT}/api/messages`);
  assertEquals(bodyOf(calls[0]), { contactPhone: "1234567890", mode: "AUTO", text: "Hello!" });
  assertEquals(result.id, SENT.id);
  assertEquals(result.credits, 1);
});

/**
 * `credits` is documented as "Actual credits amount. Can be negative" — a
 * refund. It is returned as the vendor sent it, not clamped.
 */
Deno.test("message-send: a negative credit figure is a refund, not an error", async () => {
  const { ctx } = mockCtx([{ status: 201, body: { id: "abc", credits: -3 } }]);
  const result = await messageSend.execute(
    { contactPhone: "1234567890", mode: "AUTO", text: "Hello!" },
    ctx,
  ) as { credits: number };
  assertEquals(result.credits, -3);
});

Deno.test("message-send: blank optionals are left out of the body entirely", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: SENT }]);
  await messageSend.execute(
    {
      contactPhone: "1234567890",
      mode: "MMS_PREFERRED",
      text: "Hi",
      accountPhone: "",
      subject: undefined,
      mediaItems: [],
    },
    ctx,
  );
  const body = bodyOf(calls[0]);
  assertEquals(Object.keys(body).sort(), ["contactPhone", "mode", "text"]);
});

Deno.test("message-send: media items are sent as the array the vendor accepts", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: SENT }]);
  await messageSend.execute(
    {
      contactPhone: "1234567890",
      mode: "MMS_PREFERRED",
      text: "Look",
      mediaItems: ["507f1f77bcf86cd799439011", "https://example.com/img.jpg"],
    },
    ctx,
  );
  assertEquals(bodyOf(calls[0]).mediaItems, [
    "507f1f77bcf86cd799439011",
    "https://example.com/img.jpg",
  ]);
});

Deno.test("message-send: the mode param carries the schema's enum and its documented default", () => {
  const mode = messageSend.params!.find((p) => p.key === "mode");
  assertEquals(mode?.default, "AUTO");
  assertEquals(mode?.required, true);
  assertEquals((mode?.options as Array<{ value: string }>).map((o) => o.value), [
    "AUTO",
    "SINGLE_SMS_STRICTLY",
    "MMS_PREFERRED",
  ]);
});

/**
 * No idempotency key exists on this endpoint, so a retry is a second SMS to a
 * real phone and a second charge. The declaration must stay `false`.
 */
Deno.test("message-send: is not idempotent, because a retry texts a person twice", () => {
  assertEquals(messageSend.idempotent, false);
});

Deno.test("message-send: a rejected send surfaces the vendor's own code", async () => {
  const { ctx } = mockCtx([
    {
      status: 400,
      body: {
        status: "BAD_REQUEST",
        errorCode: "ERR_MESSAGE_INVALID",
        message: "Text is required",
      },
    },
  ]);
  await assertRejects(
    async () => await messageSend.execute({ contactPhone: "1", mode: "AUTO", text: "x" }, ctx),
    Error,
    "ERR_MESSAGE_INVALID",
  );
});

Deno.test("message-send: never touches the credential", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: SENT }]);
  await messageSend.execute({ contactPhone: "1234567890", mode: "AUTO", text: "Hi" }, ctx);
  assertEquals(calls[0].headers["authorization"], undefined);
  assert(calls[0].url.includes("Bearer") === false);
});
