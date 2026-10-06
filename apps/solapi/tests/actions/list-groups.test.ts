import { assert, assertEquals, assertRejects } from "@std/assert";
import listGroups from "../../actions/list-groups.ts";
import { errBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const sample = {
  "criteria": "status",
  "cond": "eq",
  "value": "COMPLETE",
  "limit": 5,
};
const run = (
  ctx: Parameters<typeof listGroups.execute>[1],
  input: Record<string, unknown> = sample,
) => listGroups.execute(input as never, ctx) as Promise<unknown>;

Deno.test("list-groups: declares a read action with a description, params and output", () => {
  assertEquals(listGroups.key, "list-groups");
  assertEquals(listGroups.type, "read");
  assert((listGroups.description ?? "").length > 0);
  assert(Array.isArray(listGroups.output) && listGroups.output.length > 0);
  assertEquals(listGroups.idempotent, undefined);
});

Deno.test("list-groups: sends the documented request and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "startKey": null,
      "limit": 5,
      "groupList": {
        "G4V1": {
          "groupId": "G4V1",
          "status": "COMPLETE",
        },
      },
    },
  }]);
  const out = await run(ctx);
  assertEquals(out, {
    "items": [
      {
        "groupId": "G4V1",
        "status": "COMPLETE",
      },
    ],
    "count": 1,
    "nextKey": null,
    "limit": 5,
  });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/messages/v4/groups");
  assertEquals(calls[0].url.startsWith("https://api.solapi.com/"), true);
  assertEquals(queryOf(calls[0].url), {
    "criteria": "status",
    "cond": "eq",
    "value": "COMPLETE",
    "limit": "5",
  });
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("list-groups: a SOLAPI error body is thrown with its code and message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errBody("Unauthorized", "no permission") }]);
  await assertRejects(() => run(ctx), Error, "SOLAPI 401: Unauthorized: no permission");
});
