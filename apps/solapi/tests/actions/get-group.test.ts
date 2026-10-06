import { assert, assertEquals, assertRejects } from "@std/assert";
import getGroup from "../../actions/get-group.ts";
import { errBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const sample = {
  "groupId": "G4V1",
};
const run = (
  ctx: Parameters<typeof getGroup.execute>[1],
  input: Record<string, unknown> = sample,
) => getGroup.execute(input as never, ctx) as Promise<unknown>;

Deno.test("get-group: declares a read action with a description, params and output", () => {
  assertEquals(getGroup.key, "get-group");
  assertEquals(getGroup.type, "read");
  assert((getGroup.description ?? "").length > 0);
  assert(Array.isArray(getGroup.output) && getGroup.output.length > 0);
  assertEquals(getGroup.idempotent, undefined);
});

Deno.test("get-group: sends the documented request and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "groupId": "G4V1",
      "status": "COMPLETE",
      "count": {
        "total": 3,
      },
      "scheduledDate": null,
    },
  }]);
  const out = await run(ctx);
  assertEquals(out, {
    "groupId": "G4V1",
    "status": "COMPLETE",
    "scheduledDate": null,
    "count": {
      "total": 3,
    },
    "group": {
      "groupId": "G4V1",
      "status": "COMPLETE",
      "count": {
        "total": 3,
      },
      "scheduledDate": null,
    },
  });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/messages/v4/groups/G4V1");
  assertEquals(calls[0].url.startsWith("https://api.solapi.com/"), true);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("get-group: a SOLAPI error body is thrown with its code and message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errBody("Unauthorized", "no permission") }]);
  await assertRejects(() => run(ctx), Error, "SOLAPI 401: Unauthorized: no permission");
});
