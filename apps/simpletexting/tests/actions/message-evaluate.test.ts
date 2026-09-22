import { assertEquals } from "@std/assert";
import messageEvaluate from "../../actions/message-evaluate.ts";
import { API_ROOT, bodyOf, mockCtx } from "../_helpers.ts";

/** The `MessageInfo` shape, from the document's own schema. */
const INFO = {
  detectedCategory: "EXTENDED_SMS",
  length: 200,
  remains: 106,
  maxLength: 306,
  unicode: false,
  sumOfCredits: 2,
  warnings: [],
  errors: [],
};

Deno.test("message-evaluate: POSTs the body it is evaluating and returns the verdict", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: INFO }]);
  const result = await messageEvaluate.execute({ mode: "AUTO", text: "x".repeat(200) }, ctx) as {
    detectedCategory: string;
    sumOfCredits: number;
  };

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, `${API_ROOT}/api/messages/evaluate`);
  assertEquals(bodyOf(calls[0]), { mode: "AUTO", text: "x".repeat(200) });
  assertEquals(result.detectedCategory, "EXTENDED_SMS");
  assertEquals(result.sumOfCredits, 2);
});

/**
 * A `201` carrying `errors` is still a `201`: the vendor reports "this message
 * would be rejected" in the body. Throwing would destroy the answer the caller
 * asked for, so the action returns it.
 */
Deno.test("message-evaluate: a 201 with errors is returned, not thrown", async () => {
  const { ctx } = mockCtx([
    { status: 201, body: { ...INFO, errors: ["Text is too long"] } },
  ]);
  const result = await messageEvaluate.execute({
    mode: "SINGLE_SMS_STRICTLY",
    text: "x".repeat(400),
  }, ctx) as {
    errors: string[];
    detectedCategory: string;
  };
  assertEquals(result.errors, ["Text is too long"]);
  assertEquals(result.detectedCategory, "EXTENDED_SMS");
});

/** It sends nothing and charges nothing; the verb is the vendor's, not a side effect. */
Deno.test("message-evaluate: is declared a read, with no idempotency flag", () => {
  assertEquals(messageEvaluate.type, "read");
  assertEquals(messageEvaluate.idempotent, undefined);
});

Deno.test("message-evaluate: the mode param is required and defaults to AUTO", () => {
  const mode = messageEvaluate.params!.find((p) => p.key === "mode");
  assertEquals(mode?.required, true);
  assertEquals(mode?.default, "AUTO");
  assertEquals(
    messageEvaluate.params!.find((p) => p.key === "text")?.required,
    true,
  );
});

Deno.test("message-evaluate: media items are forwarded when supplied", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { ...INFO, detectedCategory: "MMS" } }]);
  await messageEvaluate.execute(
    { mode: "MMS_PREFERRED", text: "Look", mediaItems: ["507f1f77bcf86cd799439011"] },
    ctx,
  );
  assertEquals(bodyOf(calls[0]).mediaItems, ["507f1f77bcf86cd799439011"]);
});
