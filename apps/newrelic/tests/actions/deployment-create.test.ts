import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action, { parseTimestamp } from "../../actions/deployment-create.ts";

const created = ok({
  changeTrackingCreateDeployment: {
    deploymentId: "d1",
    entityGuid: "g1",
    version: "1.4.2",
    timestamp: 1_787_000_000_000,
  },
});

Deno.test("deployment-create: sends the deployment input, dropping the empties", async () => {
  const { ctx, calls } = mockCtx([created], { display });
  const result = await action.execute!({
    guid: "g1",
    version: "1.4.2",
    commit: "abc123",
    user: "ci",
  }, ctx) as { deploymentId: string };
  const deployment = JSON.parse(calls[0].body!).variables.deployment;
  assertEquals(deployment.entityGuid, "g1");
  assertEquals(deployment.version, "1.4.2");
  assertEquals(deployment.commit, "abc123");
  assertEquals(deployment.deploymentType, "BASIC");
  assertEquals(deployment.description, undefined);
  assertEquals(result.deploymentId, "d1");
});

/**
 * New Relic rejects a timestamp more than 24 hours from now, so a backfill or a
 * skewed build agent fails — with a message about the window, not the cause.
 */
Deno.test("deployment-create: a timestamp outside the 24-hour window is refused up front", async () => {
  const { ctx, calls } = mockCtx([], { display });
  const lastMonth = new Date(Date.now() - 30 * 24 * 3600_000).toISOString();
  const error = await assertRejects(
    async () => await action.execute!({ guid: "g1", version: "1", timestamp: lastMonth }, ctx),
    Error,
  );
  assert(/more than 24/.test(error.message), error.message);
  assert(/skewed clock/.test(error.message), error.message);
  assertEquals(calls.length, 0);
});

Deno.test("deployment-create: a timestamp inside the window goes through", async () => {
  const { ctx, calls } = mockCtx([created], { display });
  const anHourAgo = new Date(Date.now() - 3600_000).toISOString();
  await action.execute!({ guid: "g1", version: "1", timestamp: anHourAgo }, ctx);
  assert(JSON.parse(calls[0].body!).variables.deployment.timestamp > 0);
});

/** Seconds would land in 1970 and fail with a message about the window. */
Deno.test("deployment-create: epoch seconds are recognised and converted", () => {
  assertEquals(parseTimestamp("1787000000"), 1_787_000_000_000);
  assertEquals(parseTimestamp("1787000000000"), 1_787_000_000_000);
  assertEquals(parseTimestamp(""), undefined);
  assertEquals(parseTimestamp("2026-08-18T00:00:00Z"), Date.parse("2026-08-18T00:00:00Z"));
});

Deno.test("deployment-create: an unparseable timestamp is refused", () => {
  try {
    parseTimestamp("some time last week");
    throw new Error("should have thrown");
  } catch (err) {
    assert(/neither epoch milliseconds nor a parseable date/.test(String(err)), String(err));
  }
});

Deno.test("deployment-create: an unknown deployment type is refused", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ guid: "g1", version: "1", deploymentType: "YOLO" }, ctx),
    Error,
    "BASIC, BLUE_GREEN",
  );
  assertEquals(calls.length, 0);
});

Deno.test("deployment-create: the type is upper-cased before sending", async () => {
  const { ctx, calls } = mockCtx([created], { display });
  await action.execute!({ guid: "g1", version: "1", deploymentType: "canary" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).variables.deployment.deploymentType, "CANARY");
});

Deno.test("deployment-create: needs a guid and a version", async () => {
  const noGuid = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ version: "1" }, noGuid.ctx),
    Error,
    "`guid` is required",
  );
  const noVersion = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ guid: "g1" }, noVersion.ctx),
    Error,
    "`version` is required",
  );
});

Deno.test("deployment-create: logs the version and type", async () => {
  const { ctx, logs } = mockCtx([created], { display });
  await action.execute!({ guid: "g1", version: "1.4.2" }, ctx);
  assertEquals(logs[0].data, { version: "1.4.2", deploymentType: "BASIC", deploymentId: "d1" });
});

/** Each call makes a new marker; there is no upsert. */
Deno.test("deployment-create: is non-idempotent and warns about the window", () => {
  assertEquals(action.idempotent, false);
  assert(/within 24 hours of now/.test(action.description!), action.description);
});

/**
 * This mutation has no `errors` payload, so the only confirmation that anything
 * was recorded is that an id came back.
 */
Deno.test("deployment-create: a payload with no id is treated as nothing recorded", async () => {
  const { ctx } = mockCtx([ok({ changeTrackingCreateDeployment: null })], { display });
  const error = await assertRejects(
    async () => await action.execute!({ guid: "g1", version: "1" }, ctx),
    Error,
  );
  assert(/nothing was\s+recorded/.test(error.message), error.message);
  assert(/cannot write to/.test(error.message), error.message);
});
