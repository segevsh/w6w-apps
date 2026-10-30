import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx, optionValues, param } from "../_helpers.ts";
import logCall from "../../actions/log-call.ts";
import { CALL_OUTCOMES } from "../../lib/client.ts";

test("log-call: POSTs /calls with the documented body", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 7 } }]);
  await logCall.execute({
    personId: 12254,
    phone: "555-405-0815",
    isIncoming: false,
    note: "Call back Friday",
    outcome: "Interested",
    duration: 63,
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    personId: 12254,
    phone: "555-405-0815",
    isIncoming: false,
    note: "Call back Friday",
    outcome: "Interested",
    duration: 63,
  });
});

/** `isIncoming` is a REQUIRED boolean — the API models no unknown direction. */

/** `isIncoming` is a REQUIRED boolean — the API models no unknown direction. */
test("log-call: requires personId, phone and isIncoming", () => {
  assertEquals(
    (logCall.params ?? []).filter((p) => p.required).map((p) => p.key),
    ["personId", "phone", "isIncoming"],
  );
});

test("log-call: offers exactly the six documented outcomes", () => {
  assertEquals(optionValues(logCall, "outcome"), [...CALL_OUTCOMES]);
  assertEquals(CALL_OUTCOMES.length, 6);
});

test("log-call: flags that only an admin key can set userId", () => {
  assert(param(logCall, "userId").hint?.includes("administrator"));
});
