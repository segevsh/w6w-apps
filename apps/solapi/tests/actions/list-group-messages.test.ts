import { assert, assertEquals, assertRejects } from "@std/assert";
import listGroupMessages from "../../actions/list-group-messages.ts";
import { errBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const sample = {
  "groupId": "G4V1",
  "limit": 2,
};
const run = (
  ctx: Parameters<typeof listGroupMessages.execute>[1],
  input: Record<string, unknown> = sample,
) => listGroupMessages.execute(input as never, ctx) as Promise<unknown>;

Deno.test("list-group-messages: declares a read action with a description, params and output", () => {
  assertEquals(listGroupMessages.key, "list-group-messages");
  assertEquals(listGroupMessages.type, "read");
  assert((listGroupMessages.description ?? "").length > 0);
  assert(Array.isArray(listGroupMessages.output) && listGroupMessages.output.length > 0);
  assertEquals(listGroupMessages.idempotent, undefined);
});

Deno.test("list-group-messages: sends the documented request and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "startKey": null,
      "nextKey": "M4V9",
      "limit": 2,
      "messageList": {
        "M4V1": {
          "messageId": "M4V1",
        },
      },
    },
  }]);
  const out = await run(ctx);
  assertEquals(out, {
    "items": [
      {
        "messageId": "M4V1",
      },
    ],
    "count": 1,
    "nextKey": "M4V9",
    "limit": 2,
  });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/messages/v4/groups/G4V1/messages");
  assertEquals(calls[0].url.startsWith("https://api.solapi.com/"), true);
  assertEquals(queryOf(calls[0].url), {
    "limit": "2",
  });
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("list-group-messages: a SOLAPI error body is thrown with its code and message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errBody("Unauthorized", "no permission") }]);
  await assertRejects(() => run(ctx), Error, "SOLAPI 401: Unauthorized: no permission");
});
