import { assert, assertEquals, assertRejects } from "@std/assert";
import createGroup from "../../actions/create-group.ts";
import { errBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const sample = {
  "strict": true,
  "customFields": {
    "campaign": "oct",
  },
};
const run = (
  ctx: Parameters<typeof createGroup.execute>[1],
  input: Record<string, unknown> = sample,
) => createGroup.execute(input as never, ctx) as Promise<unknown>;

Deno.test("create-group: declares a perform action with a description, params and output", () => {
  assertEquals(createGroup.key, "create-group");
  assertEquals(createGroup.type, "perform");
  assert((createGroup.description ?? "").length > 0);
  assert(Array.isArray(createGroup.output) && createGroup.output.length > 0);
  assertEquals(createGroup.idempotent, false);
});

Deno.test("create-group: sends the documented request and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "groupId": "G4V5",
      "status": "PENDING",
      "count": {
        "total": 0,
      },
    },
  }]);
  const out = await run(ctx);
  assertEquals(out, {
    "groupId": "G4V5",
    "status": "PENDING",
    "scheduledDate": null,
    "count": {
      "total": 0,
    },
    "group": {
      "groupId": "G4V5",
      "status": "PENDING",
      "count": {
        "total": 0,
      },
    },
  });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/messages/v4/groups");
  assertEquals(calls[0].url.startsWith("https://api.solapi.com/"), true);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "strict": true,
    "customFields": {
      "campaign": "oct",
    },
  });
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("create-group: a SOLAPI error body is thrown with its code and message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errBody("Unauthorized", "no permission") }]);
  await assertRejects(() => run(ctx), Error, "SOLAPI 401: Unauthorized: no permission");
});
