import { assert, assertEquals, assertRejects } from "@std/assert";
import deleteGroup from "../../actions/delete-group.ts";
import { errBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const sample = {
  "groupId": "G4V1",
};
const run = (
  ctx: Parameters<typeof deleteGroup.execute>[1],
  input: Record<string, unknown> = sample,
) => deleteGroup.execute(input as never, ctx) as Promise<unknown>;

Deno.test("delete-group: declares a perform action with a description, params and output", () => {
  assertEquals(deleteGroup.key, "delete-group");
  assertEquals(deleteGroup.type, "perform");
  assert((deleteGroup.description ?? "").length > 0);
  assert(Array.isArray(deleteGroup.output) && deleteGroup.output.length > 0);
  assertEquals(deleteGroup.idempotent, false);
});

Deno.test("delete-group: sends the documented request and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "groupId": "G4V1",
      "status": "DELETED",
    },
  }]);
  const out = await run(ctx);
  assertEquals(out, {
    "groupId": "G4V1",
    "status": "DELETED",
    "scheduledDate": null,
    "count": null,
    "group": {
      "groupId": "G4V1",
      "status": "DELETED",
    },
  });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/messages/v4/groups/G4V1");
  assertEquals(calls[0].url.startsWith("https://api.solapi.com/"), true);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("delete-group: a SOLAPI error body is thrown with its code and message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errBody("Unauthorized", "no permission") }]);
  await assertRejects(() => run(ctx), Error, "SOLAPI 401: Unauthorized: no permission");
});
