import { assert, assertEquals, assertRejects } from "@std/assert";
import listMessages from "../../actions/list-messages.ts";
import { errBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const sample = {
  "groupId": "G4V1",
  "to": "01012345678",
  "limit": 10,
  "startKey": "M4Vk",
};
const run = (
  ctx: Parameters<typeof listMessages.execute>[1],
  input: Record<string, unknown> = sample,
) => listMessages.execute(input as never, ctx) as Promise<unknown>;

Deno.test("list-messages: declares a read action with a description, params and output", () => {
  assertEquals(listMessages.key, "list-messages");
  assertEquals(listMessages.type, "read");
  assert((listMessages.description ?? "").length > 0);
  assert(Array.isArray(listMessages.output) && listMessages.output.length > 0);
  assertEquals(listMessages.idempotent, undefined);
});

Deno.test("list-messages: sends the documented request and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "startKey": "M4Vk",
      "nextKey": "M4Vn",
      "limit": 10,
      "messageList": {
        "M4V1": {
          "messageId": "M4V1",
          "status": "COMPLETE",
        },
        "M4V2": {
          "messageId": "M4V2",
          "status": "SENDING",
        },
      },
    },
  }]);
  const out = await run(ctx);
  assertEquals(out, {
    "items": [
      {
        "messageId": "M4V1",
        "status": "COMPLETE",
      },
      {
        "messageId": "M4V2",
        "status": "SENDING",
      },
    ],
    "count": 2,
    "nextKey": "M4Vn",
    "limit": 10,
  });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/messages/v4/list");
  assertEquals(calls[0].url.startsWith("https://api.solapi.com/"), true);
  assertEquals(queryOf(calls[0].url), {
    "groupId": "G4V1",
    "to": "01012345678",
    "limit": "10",
    "startKey": "M4Vk",
  });
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("list-messages: a SOLAPI error body is thrown with its code and message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errBody("Unauthorized", "no permission") }]);
  await assertRejects(() => run(ctx), Error, "SOLAPI 401: Unauthorized: no permission");
});
