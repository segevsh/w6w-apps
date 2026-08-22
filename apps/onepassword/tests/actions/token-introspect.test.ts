import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, eventsDisplay, ok } from "./_shared.ts";
import action from "../../actions/token-introspect.ts";

/** Grants are per event kind, so a 403 on one endpoint is scope, not a fault. */
Deno.test("token-introspect: reports which actions this token can run", async () => {
  const { ctx, calls } = mockCtx([
    ok({ Features: ["signinattempts", "itemusages"], UUID: "t1", IssuedAt: "2026-01-01" }),
  ], { display: eventsDisplay });
  const result = await action.execute!({}, ctx) as {
    canReadAuditEvents: boolean;
    canReadItemUsages: boolean;
    canReadSignInAttempts: boolean;
    uuid: string;
  };
  assertEquals(calls[0].url, "https://events.1password.com/api/auth/introspect");
  assertEquals(result.canReadSignInAttempts, true);
  assertEquals(result.canReadItemUsages, true);
  assertEquals(result.canReadAuditEvents, false);
  assertEquals(result.uuid, "t1");
});

Deno.test("token-introspect: a token granted everything reports everything", async () => {
  const { ctx } = mockCtx([
    ok({ Features: ["auditevents", "itemusages", "signinattempts"] }),
  ], { display: eventsDisplay });
  const result = await action.execute!({}, ctx) as {
    canReadAuditEvents: boolean;
    canReadItemUsages: boolean;
    canReadSignInAttempts: boolean;
  };
  assert(result.canReadAuditEvents && result.canReadItemUsages && result.canReadSignInAttempts);
});

Deno.test("token-introspect: a token granted nothing reports nothing", async () => {
  const { ctx } = mockCtx([ok({ Features: [] })], { display: eventsDisplay });
  const result = await action.execute!({}, ctx) as {
    features: string[];
    canReadAuditEvents: boolean;
  };
  assertEquals(result.features, []);
  assertEquals(result.canReadAuditEvents, false);
});

Deno.test("token-introspect: a Connect connection is refused", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "**Events**");
  assertEquals(calls.length, 0);
});

Deno.test("token-introspect: takes no parameters", () => {
  assertEquals(action.params?.length ?? 0, 0);
  assert(/scope rather than a fault/.test(action.description!), action.description);
});
