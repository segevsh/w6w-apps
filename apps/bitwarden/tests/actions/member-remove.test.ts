import { assertEquals, assertMatch, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/member-remove.ts";

const D = { display: { region: "us" } };

Deno.test("member-remove: DELETEs the member", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: "" }], D);
  const result = await action.execute(
    { memberId: "3f2b8c1e-5a4d-4e6f-9a1b-7c8d9e0f1a2b" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(calls[0].method, "DELETE");
  assertEquals(result, { removed: true, id: "3f2b8c1e-5a4d-4e6f-9a1b-7c8d9e0f1a2b" });
});

Deno.test("member-remove: rejects an id that is not a UUID before any request", async () => {
  const { ctx, calls } = mockCtx([], D);
  const err = await assertRejects(async () =>
    await action.execute({
      memberId: "not-a-uuid",
      type: 2,
      name: "x",
      memberIds: "",
      groupIds: "",
      enabled: true,
    }, ctx)
  );
  assertMatch((err as Error).message, /must be a UUID/);
  assertEquals(calls.length, 0);
});
