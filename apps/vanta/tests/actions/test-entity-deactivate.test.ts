import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display } from "./_shared.ts";
import action from "../../actions/test-entity-deactivate.ts";

const ok = { status: 200, body: {} };

Deno.test("test-entity-deactivate: posts the reason and a default expiry", async () => {
  const { ctx, calls } = mockCtx([ok], { display });
  await action.execute!({
    testId: "t1",
    entityId: "e1",
    reason: "Decommissioned 2026-08-01, pending asset removal.",
  }, ctx);
  assertEquals(calls[0].url, "https://api.vanta.com/v1/tests/t1/entities/e1/deactivate");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.deactivateReason, "Decommissioned 2026-08-01, pending asset removal.");
  assert(Date.parse(body.deactivateUntilDate) > Date.now(), body.deactivateUntilDate);
});

/**
 * An indefinite exception outlives the situation that justified it and stops
 * appearing in any report.
 */
Deno.test("test-entity-deactivate: an indefinite exclusion is warned about", async () => {
  const { ctx, calls, logs } = mockCtx([ok], { display });
  await action.execute!({ testId: "t1", entityId: "e1", reason: "x", expiresInDays: 0 }, ctx);
  assertEquals(JSON.parse(calls[0].body!).deactivateUntilDate, undefined);
  const warning = logs.find((l) => l.level === "warn");
  assert(warning, "no warning for an indefinite exception");
  assert(/indefinitely/.test(warning!.message), warning!.message);
});

/** The reason goes in the audit trail and is what an auditor reads. */
Deno.test("test-entity-deactivate: refuses without a reason, and says why", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ testId: "t1", entityId: "e1", reason: "  " }, ctx),
    Error,
    "audit trail",
  );
  assertEquals(calls.length, 0);
});

Deno.test("test-entity-deactivate: needs both ids", async () => {
  const noTest = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ entityId: "e1", reason: "x" }, noTest.ctx),
    Error,
    "testId",
  );
  const noEntity = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ testId: "t1", reason: "x" }, noEntity.ctx),
    Error,
    "entityId",
  );
});

/** It does not fix anything — the test goes green and the condition stays. */
Deno.test("test-entity-deactivate: says plainly that it fixes nothing", () => {
  assert(/does not fix anything/.test(action.description!), action.description);
});
