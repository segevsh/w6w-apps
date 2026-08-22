import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-update.ts";

const display = { display: { region: "us" } };

Deno.test("user-update: PUTs only the fields that were set", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { _id: "u1" } }], display);
  await action.execute!({ userId: "u1", department: "Engineering", company: "" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(new URL(calls[0].url).pathname, "/api/systemusers/u1");
  assertEquals(JSON.parse(calls[0].body!), { department: "Engineering" });
});

/** State is an access decision and belongs to its own action. */
Deno.test("user-update: does not offer a state field", () => {
  const keys = (action.params as Array<{ key: string }>).map((p) => p.key);
  assert(!keys.includes("state"), "state must not be settable here");
});

Deno.test("user-update: an update with nothing set is refused, not sent", async () => {
  const { ctx, calls } = mockCtx([], display);
  await assertRejects(
    async () => await action.execute!({ userId: "u1" }, ctx),
    Error,
    "nothing to update",
  );
  assertEquals(calls.length, 0);
});
