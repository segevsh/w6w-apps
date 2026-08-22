import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/profile-delete.ts";

const conn = { display: { projectId: "123", region: "us", hasProjectToken: true } };

Deno.test("profile-delete: refuses without confirmation", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ distinctIds: "u1" }, ctx),
    Error,
    "confirm",
  );
  assertEquals(calls.length, 0);
});

Deno.test("profile-delete: confirmed, it sends one $delete per id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { status: 1 } }], conn);
  await action.execute!({ distinctIds: "u1, u2", confirm: true }, ctx);
  assertEquals(JSON.parse(calls[0].body!), [
    { $distinct_id: "u1", $delete: "" },
    { $distinct_id: "u2", $delete: "" },
  ]);
});

/** The events survive — this is not a GDPR erasure. */
Deno.test("profile-delete: says plainly that events are not deleted", () => {
  assert(/EVENTS remain|not a GDPR/i.test(action.description!), action.description);
});
