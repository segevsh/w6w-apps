import { assert, assertEquals, assertRejects } from "@std/assert";
import sendGroup from "../../actions/send-group.ts";
import { errBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const sample = {
  "groupId": "G4V1",
};
const run = (
  ctx: Parameters<typeof sendGroup.execute>[1],
  input: Record<string, unknown> = sample,
) => sendGroup.execute(input as never, ctx) as Promise<unknown>;

Deno.test("send-group: declares a perform action with a description, params and output", () => {
  assertEquals(sendGroup.key, "send-group");
  assertEquals(sendGroup.type, "perform");
  assert((sendGroup.description ?? "").length > 0);
  assert(Array.isArray(sendGroup.output) && sendGroup.output.length > 0);
  assertEquals(sendGroup.idempotent, false);
});

Deno.test("send-group: sends the documented request and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "groupId": "G4V1",
      "status": "SENDING",
      "count": {
        "total": 1,
      },
    },
  }]);
  const out = await run(ctx);
  assertEquals(out, {
    "groupId": "G4V1",
    "status": "SENDING",
    "scheduledDate": null,
    "count": {
      "total": 1,
    },
    "group": {
      "groupId": "G4V1",
      "status": "SENDING",
      "count": {
        "total": 1,
      },
    },
  });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/messages/v4/groups/G4V1/send");
  assertEquals(calls[0].url.startsWith("https://api.solapi.com/"), true);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("send-group: a SOLAPI error body is thrown with its code and message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errBody("Unauthorized", "no permission") }]);
  await assertRejects(() => run(ctx), Error, "SOLAPI 401: Unauthorized: no permission");
});
