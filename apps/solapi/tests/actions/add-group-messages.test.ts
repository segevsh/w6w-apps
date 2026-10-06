import { assert, assertEquals, assertRejects } from "@std/assert";
import addGroupMessages from "../../actions/add-group-messages.ts";
import { errBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const sample = {
  "groupId": "G4V1",
  "messages": [
    {
      "to": "01012345678",
      "from": "029302266",
      "text": "Hi",
    },
  ],
};
const run = (
  ctx: Parameters<typeof addGroupMessages.execute>[1],
  input: Record<string, unknown> = sample,
) => addGroupMessages.execute(input as never, ctx) as Promise<unknown>;

Deno.test("add-group-messages: declares a perform action with a description, params and output", () => {
  assertEquals(addGroupMessages.key, "add-group-messages");
  assertEquals(addGroupMessages.type, "perform");
  assert((addGroupMessages.description ?? "").length > 0);
  assert(Array.isArray(addGroupMessages.output) && addGroupMessages.output.length > 0);
  assertEquals(addGroupMessages.idempotent, false);
});

Deno.test("add-group-messages: sends the documented request and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "errorCount": 0,
      "resultList": [
        {
          "to": "01012345678",
          "messageId": "M4V1",
          "statusCode": "2000",
        },
      ],
    },
  }]);
  const out = await run(ctx);
  assertEquals(out, {
    "errorCount": 0,
    "resultList": [
      {
        "to": "01012345678",
        "messageId": "M4V1",
        "statusCode": "2000",
      },
    ],
  });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/messages/v4/groups/G4V1/messages");
  assertEquals(calls[0].url.startsWith("https://api.solapi.com/"), true);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "messages": [
      {
        "to": "01012345678",
        "from": "029302266",
        "text": "Hi",
      },
    ],
  });
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("add-group-messages: a SOLAPI error body is thrown with its code and message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errBody("Unauthorized", "no permission") }]);
  await assertRejects(() => run(ctx), Error, "SOLAPI 401: Unauthorized: no permission");
});
