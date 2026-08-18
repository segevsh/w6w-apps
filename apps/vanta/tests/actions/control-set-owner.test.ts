import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display } from "./_shared.ts";
import action from "../../actions/control-set-owner.ts";

const ok = { status: 200, body: {} };

Deno.test("control-set-owner: posts the user id", async () => {
  const { ctx, calls } = mockCtx([ok], { display });
  assertEquals(await action.execute!({ controlId: "c1", userId: "u1" }, ctx), { ok: true });
  assertEquals(calls[0].url, "https://api.vanta.com/v1/controls/c1/set-owner");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { userId: "u1" });
});

/** Unassigning is the honest record when the previous owner has left. */
Deno.test("control-set-owner: the literal null unassigns the control", async () => {
  const { ctx, calls, logs } = mockCtx([ok], { display });
  await action.execute!({ controlId: "c1", userId: "null" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { userId: null });
  assert(/unassigned/.test(logs[0].message), logs[0].message);
});

Deno.test("control-set-owner: needs both a control and a user", async () => {
  const noControl = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ userId: "u1" }, noControl.ctx),
    Error,
    "controlId",
  );
  const noUser = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ controlId: "c1" }, noUser.ctx),
    Error,
    "unassign",
  );
});

/** The mistake to avoid: person ids and user ids are different rosters. */
Deno.test("control-set-owner: says it takes a user, not a person", () => {
  assert(/not a person/.test(action.description!), action.description);
  const p = (action.params as Array<{ key: string; hint?: string }>).find((p) =>
    p.key === "userId"
  )!;
  assert(/person-list/.test(p.hint!), p.hint);
});
