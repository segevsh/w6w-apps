import { assert, assertEquals, assertRejects } from "@std/assert";
import listSenderNumbers from "../../actions/list-sender-numbers.ts";
import { errBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const sample = {};
const run = (
  ctx: Parameters<typeof listSenderNumbers.execute>[1],
  input: Record<string, unknown> = sample,
) => listSenderNumbers.execute(input as never, ctx) as Promise<unknown>;

Deno.test("list-sender-numbers: declares a read action with a description, params and output", () => {
  assertEquals(listSenderNumbers.key, "list-sender-numbers");
  assertEquals(listSenderNumbers.type, "read");
  assert((listSenderNumbers.description ?? "").length > 0);
  assert(Array.isArray(listSenderNumbers.output) && listSenderNumbers.output.length > 0);
  assertEquals(listSenderNumbers.idempotent, undefined);
});

Deno.test("list-sender-numbers: sends the documented request and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "accountId": "AC1",
      "limit": 5,
      "senderIds": [
        {
          "handleKey": "SID_1",
          "phoneNumber": "029302266",
          "status": "ACTIVE",
        },
      ],
    },
  }]);
  const out = await run(ctx);
  assertEquals(out, {
    "accountId": "AC1",
    "limit": 5,
    "items": [
      {
        "handleKey": "SID_1",
        "phoneNumber": "029302266",
        "status": "ACTIVE",
      },
    ],
    "count": 1,
  });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/senderid/v1/numbers");
  assertEquals(calls[0].url.startsWith("https://api.solapi.com/"), true);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("list-sender-numbers: a SOLAPI error body is thrown with its code and message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errBody("Unauthorized", "no permission") }]);
  await assertRejects(() => run(ctx), Error, "SOLAPI 401: Unauthorized: no permission");
});
