import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-update.ts";

test("user-update: PATCHes attribute fields only, never metadata", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "user_1" } }]);
  await action.execute!({ userId: "user_1", firstName: "Ada" }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(new URL(calls[0].url).pathname, "/v1/users/user_1");
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent, { first_name: "Ada" });
});

/** The 2026-05-12 API version rejects metadata here — there is no metadata param to send. */
test("user-update: declares no metadata param", () => {
  const keys = (action.params as Array<{ key: string }>).map((p) => p.key);
  for (const forbidden of ["publicMetadata", "privateMetadata", "unsafeMetadata"]) {
    if (keys.includes(forbidden)) throw new Error(`user-update should not expose ${forbidden}`);
  }
});
