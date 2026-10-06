import { assert, assertEquals, assertRejects } from "@std/assert";
import sendAlimtalk from "../../actions/send-alimtalk.ts";
import { errBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const sample = {
  "to": "01012345678",
  "pfId": "KA01PF1",
  "templateId": "KA01TP1",
  "variables": {
    "#{name}": "Hong",
  },
  "from": "029302266",
  "disableSms": true,
};
const run = (
  ctx: Parameters<typeof sendAlimtalk.execute>[1],
  input: Record<string, unknown> = sample,
) => sendAlimtalk.execute(input as never, ctx) as Promise<unknown>;

Deno.test("send-alimtalk: declares a perform action with a description, params and output", () => {
  assertEquals(sendAlimtalk.key, "send-alimtalk");
  assertEquals(sendAlimtalk.type, "perform");
  assert((sendAlimtalk.description ?? "").length > 0);
  assert(Array.isArray(sendAlimtalk.output) && sendAlimtalk.output.length > 0);
  assertEquals(sendAlimtalk.idempotent, false);
});

Deno.test("send-alimtalk: sends the documented request and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "failedMessageList": [],
      "groupInfo": {
        "groupId": "G4V3",
        "status": "PENDING",
      },
    },
  }]);
  const out = await run(ctx);
  assertEquals(out, {
    "groupId": "G4V3",
    "status": "PENDING",
    "count": null,
    "failedCount": 0,
    "failedMessageList": [],
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
        "to": "01012345678",
        "from": "029302266",
        "type": "ATA",
        "kakaoOptions": {
          "pfId": "KA01PF1",
          "templateId": "KA01TP1",
          "variables": {
            "#{name}": "Hong",
          },
          "disableSms": true,
        },
      },
    ],
    "showMessageList": true,
  });
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("send-alimtalk: a SOLAPI error body is thrown with its code and message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errBody("Unauthorized", "no permission") }]);
  await assertRejects(() => run(ctx), Error, "SOLAPI 401: Unauthorized: no permission");
});
