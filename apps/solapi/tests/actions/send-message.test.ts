import { assert, assertEquals, assertRejects } from "@std/assert";
import sendMessage from "../../actions/send-message.ts";
import { errBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const sample = {
  "to": "01012345678",
  "from": "029302266",
  "text": "Hello",
  "type": "SMS",
  "customFields": {
    "k": "v",
  },
};
const run = (
  ctx: Parameters<typeof sendMessage.execute>[1],
  input: Record<string, unknown> = sample,
) => sendMessage.execute(input as never, ctx) as Promise<unknown>;

Deno.test("send-message: declares a perform action with a description, params and output", () => {
  assertEquals(sendMessage.key, "send-message");
  assertEquals(sendMessage.type, "perform");
  assert((sendMessage.description ?? "").length > 0);
  assert(Array.isArray(sendMessage.output) && sendMessage.output.length > 0);
  assertEquals(sendMessage.idempotent, false);
});

Deno.test("send-message: sends the documented request and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "failedMessageList": [],
      "groupInfo": {
        "groupId": "G4V1",
        "status": "PENDING",
        "count": {
          "total": 1,
        },
      },
      "messageList": {
        "M4V1": {
          "messageId": "M4V1",
          "to": "01012345678",
        },
      },
    },
  }]);
  const out = await run(ctx);
  assertEquals(out, {
    "groupId": "G4V1",
    "status": "PENDING",
    "count": {
      "total": 1,
    },
    "failedCount": 0,
    "failedMessageList": [],
    "messageList": [
      {
        "messageId": "M4V1",
        "to": "01012345678",
      },
    ],
  });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/messages/v4/send-many/detail");
  assertEquals(calls[0].url.startsWith("https://api.solapi.com/"), true);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "messages": [
      {
        "to": "01012345678",
        "from": "029302266",
        "text": "Hello",
        "type": "SMS",
        "customFields": {
          "k": "v",
        },
      },
    ],
    "showMessageList": true,
  });
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("send-message: a SOLAPI error body is thrown with its code and message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errBody("Unauthorized", "no permission") }]);
  await assertRejects(() => run(ctx), Error, "SOLAPI 401: Unauthorized: no permission");
});
