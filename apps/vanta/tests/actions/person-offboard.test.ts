import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display } from "./_shared.ts";
import action from "../../actions/person-offboard.ts";

const ok = { status: 200, body: {} };

Deno.test("person-offboard: posts one update per person with the acknowledger", async () => {
  const { ctx, calls } = mockCtx([ok], { display });
  assertEquals(
    await action.execute!(
      { personIds: "p1, p2", acknowledgerId: "u1", confirm: true },
      ctx,
    ),
    { ok: true },
  );
  assertEquals(calls[0].url, "https://api.vanta.com/v1/people/offboard");
  assertEquals(JSON.parse(calls[0].body!), {
    updates: [
      { id: "p1", acknowledgerId: "u1" },
      { id: "p2", acknowledgerId: "u1" },
    ],
  });
});

/** Somebody is recorded as having done it, and an auditor asks about them. */
Deno.test("person-offboard: refuses without an acknowledger, and says why", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ personIds: "p1", confirm: true }, ctx),
    Error,
    "an auditor asks about",
  );
  assertEquals(calls.length, 0);
});

Deno.test("person-offboard: refuses without the confirmation", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ personIds: "p1", acknowledgerId: "u1" }, ctx),
    Error,
    "confirm",
  );
  assertEquals(calls.length, 0);
});

Deno.test("person-offboard: refuses more than Vanta's batch limit", async () => {
  const { ctx, calls } = mockCtx([], { display });
  const ids = Array.from({ length: 1001 }, (_, i) => `p${i}`).join(",");
  await assertRejects(
    async () => await action.execute!({ personIds: ids, acknowledgerId: "u1", confirm: true }, ctx),
    Error,
    "at most 1000",
  );
  assertEquals(calls.length, 0);
});

/** A count and the acknowledger; never the roster. */
Deno.test("person-offboard: logs the count and acknowledger only", async () => {
  const { ctx, logs } = mockCtx([ok], { display });
  await action.execute!({ personIds: "p1,p2", acknowledgerId: "u1", confirm: true }, ctx);
  assertEquals(logs[0].data, { count: 2, acknowledgerId: "u1" });
});

/** It records an offboarding; it does not reach into every system. */
Deno.test("person-offboard: does not overclaim what it does", () => {
  assert(/checklist/.test(action.description!), action.description);
});
