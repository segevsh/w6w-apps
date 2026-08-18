import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/alert-condition-list.ts";

const conditions = ok({
  actor: {
    account: {
      alerts: {
        nrqlConditionsSearch: {
          nrqlConditions: [
            {
              id: "1",
              name: "Errors",
              enabled: true,
              expiration: { openViolationOnExpiration: true },
            },
            {
              id: "2",
              name: "Latency",
              enabled: true,
              expiration: { openViolationOnExpiration: false },
            },
            { id: "3", name: "Old", enabled: false, expiration: {} },
          ],
          nextCursor: null,
        },
      },
    },
  },
});

Deno.test("alert-condition-list: searches by policy when one is given", async () => {
  const { ctx, calls } = mockCtx([conditions], { display });
  await action.execute!({ policyId: "42" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).variables.searchCriteria, { policyId: "42" });
});

Deno.test("alert-condition-list: no policy searches the whole account", async () => {
  const { ctx, calls } = mockCtx([conditions], { display });
  await action.execute!({}, ctx);
  assertEquals(JSON.parse(calls[0].body!).variables.searchCriteria, undefined);
});

/** Silenced during an incident and never turned back on. */
Deno.test("alert-condition-list: counts the disabled conditions", async () => {
  const { ctx } = mockCtx([conditions], { display });
  const result = await action.execute!({}, ctx) as { count: number; disabledCount: number };
  assertEquals(result.count, 3);
  assertEquals(result.disabledCount, 1);
});

/**
 * A condition on a dead service evaluates against no data and never fires,
 * unless somebody set it to open an incident on expiration.
 */
Deno.test("alert-condition-list: counts the conditions that would be silent if data stopped", async () => {
  const { ctx } = mockCtx([conditions], { display });
  const result = await action.execute!({}, ctx) as { silentOnNoDataCount: number };
  assertEquals(result.silentOnNoDataCount, 1, "the enabled one without expiration handling");
});

Deno.test("alert-condition-list: a disabled condition is not double-counted as silent", async () => {
  const { ctx } = mockCtx([
    ok({
      actor: {
        account: {
          alerts: {
            nrqlConditionsSearch: { nrqlConditions: [{ id: "1", enabled: false, expiration: {} }] },
          },
        },
      },
    }),
  ], { display });
  const result = await action.execute!({}, ctx) as {
    disabledCount: number;
    silentOnNoDataCount: number;
  };
  assertEquals(result.disabledCount, 1);
  assertEquals(result.silentOnNoDataCount, 0);
});

Deno.test("alert-condition-list: says what the no-data case does", () => {
  assert(/would stay silent if data stopped/.test(action.description!), action.description);
});
