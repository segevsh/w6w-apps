import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import reporting from "../../health/reporting.ts";
import { REGIONS } from "../../lib/client.ts";

const display = { region: "US", accountId: 12345 };

const entities = (total: number, quiet: number, domain = "APM") => {
  const list = [];
  for (let i = 0; i < quiet; i++) list.push({ guid: `q${i}`, reporting: false, domain });
  for (let i = quiet; i < total; i++) {
    list.push({ guid: `g${i}`, reporting: true, domain: "INFRA" });
  }
  return {
    status: 200,
    body: { data: { actor: { entitySearch: { count: total, results: { entities: list } } } } },
  };
};

test("reporting: queries the connection's own account and region", async () => {
  const { ctx, calls } = mockCtx([entities(20, 0)], { display });
  const result = await reporting.check!({}, ctx);
  assertEquals(calls[0].url, REGIONS.US);
  assert(JSON.parse(calls[0].body!).variables.query.includes("12345"), calls[0].body!);
  assertEquals(result.state, "ok");
});

/** Decommissioning churn is normal; a pipeline that stopped is not. */
test("reporting: a few quiet entities is still ok", async () => {
  const { ctx } = mockCtx([entities(100, 5)], { display });
  const result = await reporting.check!({}, ctx);
  assertEquals(result.state, "ok");
  assert(/normal decommissioning churn/.test(result.message!), result.message);
});

test("reporting: a sixth of the account is degraded", async () => {
  const { ctx } = mockCtx([entities(100, 20)], { display });
  const result = await reporting.check!({}, ctx);
  assertEquals(result.state, "degraded");
  assert(/20 of 100/.test(result.message!), result.message);
});

/**
 * The compound failure this check exists for: telemetry stops, and the alert
 * conditions that would have caught it evaluate against no data.
 */
test("reporting: half the account down names the alerting consequence", async () => {
  const { ctx } = mockCtx([entities(100, 60)], { display });
  const result = await reporting.check!({}, ctx);
  assertEquals(result.state, "down");
  assert(/telemetry pipeline has stopped/.test(result.message!), result.message);
  assert(/will not fire/.test(result.message!), result.message);
});

/** Which domains points at what stopped. */
test("reporting: the message names the domains that went quiet", async () => {
  const { ctx } = mockCtx([entities(100, 60, "SYNTH")], { display });
  const result = await reporting.check!({}, ctx);
  assert(/SYNTH \(60\)/.test(result.message!), result.message);
});

test("reporting: an account with no entities is degraded, not ok", async () => {
  const { ctx } = mockCtx([entities(0, 0)], { display });
  const result = await reporting.check!({}, ctx);
  assertEquals(result.state, "degraded");
  assert(/no entities at all/.test(result.message!), result.message);
});

/** Without a default account there is nothing to measure. */
test("reporting: a connection with no account is unknown, and says what to do", async () => {
  const { ctx, calls } = mockCtx([], { display: { region: "US" } });
  const result = await reporting.check!({}, ctx);
  assertEquals(result.state, "unknown");
  assert(/records no default account/.test(result.message!), result.message);
  assertEquals(calls.length, 0);
});

test("reporting: a rejected key is unknown; an HTTP error is down", async () => {
  const rejected = mockCtx([{ status: 401, body: { errors: [{ message: "auth" }] } }], { display });
  assertEquals((await reporting.check!({}, rejected.ctx)).state, "unknown");

  const erroring = mockCtx([{ status: 500, body: {} }], { display });
  assertEquals((await reporting.check!({}, erroring.ctx)).state, "down");
});

/** GraphQL puts its failures in a 200, and this check must not read that as data. */
test("reporting: GraphQL errors inside a 200 are unknown, not ok", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { errors: [{ message: "not authorized for account 12345" }] },
  }], { display });
  const result = await reporting.check!({}, ctx);
  assertEquals(result.state, "unknown");
  assert(/not authorized/.test(result.message!), result.message);
});

test("reporting: an unreachable endpoint is down", async () => {
  const ctx = {
    fetch: () => Promise.reject(new Error("dns")),
    log: () => {},
    connection: { display } as never,
  } as unknown as Parameters<NonNullable<typeof reporting.check>>[1];
  assertEquals((await reporting.check!({}, ctx)).state, "down");
});

test("reporting: is signed, informational, and runs rarely", () => {
  assertEquals(reporting.credential, "signed");
  assertEquals(reporting.scope, "connection");
  assertEquals(reporting.severity, "informational");
  assertEquals(reporting.minIntervalSeconds, 900);
});
