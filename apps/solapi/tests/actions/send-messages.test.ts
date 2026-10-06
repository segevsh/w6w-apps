import { assert, assertEquals, assertRejects } from "@std/assert";
import sendMessages from "../../actions/send-messages.ts";
import { errBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const sample = {
  "messages": [
    {
      "to": "01011112222",
      "from": "029302266",
      "text": "A",
    },
    {
      "to": "01033334444",
      "from": "029302266",
      "text": "B",
    },
  ],
  "scheduledDate": "2026-10-07T09:00:00+09:00",
  "allowDuplicates": true,
};
const run = (
  ctx: Parameters<typeof sendMessages.execute>[1],
  input: Record<string, unknown> = sample,
) => sendMessages.execute(input as never, ctx) as Promise<unknown>;

Deno.test("send-messages: declares a perform action with a description, params and output", () => {
  assertEquals(sendMessages.key, "send-messages");
  assertEquals(sendMessages.type, "perform");
  assert((sendMessages.description ?? "").length > 0);
  assert(Array.isArray(sendMessages.output) && sendMessages.output.length > 0);
  assertEquals(sendMessages.idempotent, false);
});

Deno.test("send-messages: sends the documented request and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "failedMessageList": [
        {
          "to": "01033334444",
          "statusCode": "1062",
        },
      ],
      "groupInfo": {
        "groupId": "G4V2",
        "status": "SCHEDULED",
        "count": {
          "total": 2,
        },
      },
    },
  }]);
  const out = await run(ctx);
  assertEquals(out, {
    "groupId": "G4V2",
    "status": "SCHEDULED",
    "count": {
      "total": 2,
    },
    "failedCount": 1,
    "failedMessageList": [
      {
        "to": "01033334444",
        "statusCode": "1062",
      },
    ],
    "messageList": [],
  });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/messages/v4/send-many/detail");
  assertEquals(calls[0].url.startsWith("https://api.solapi.com/"), true);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "messages": [
      {
        "to": "01011112222",
        "from": "029302266",
        "text": "A",
      },
      {
        "to": "01033334444",
        "from": "029302266",
        "text": "B",
      },
    ],
    "scheduledDate": "2026-10-07T09:00:00+09:00",
    "allowDuplicates": true,
    "showMessageList": true,
  });
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("send-messages: a SOLAPI error body is thrown with its code and message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errBody("Unauthorized", "no permission") }]);
  await assertRejects(() => run(ctx), Error, "SOLAPI 401: Unauthorized: no permission");
});
