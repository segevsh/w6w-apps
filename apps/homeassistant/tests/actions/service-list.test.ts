import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/service-list.ts";

const services = ok([
  { domain: "light", services: { turn_on: { fields: {} }, turn_off: { fields: {} } } },
  { domain: "notify", services: { mobile_app_phone: { fields: {} } } },
]);

Deno.test("service-list: flattens to `domain.service` names", async () => {
  const { ctx, calls } = mockCtx([services], { display });
  const result = await action.execute!({}, ctx) as { names: string[]; count: number };
  assertEquals(calls[0].url, "https://abc.ui.nabu.casa/api/services");
  assertEquals(result.names, ["light.turn_off", "light.turn_on", "notify.mobile_app_phone"]);
  assertEquals(result.count, 3);
});

Deno.test("service-list: filters by domain", async () => {
  const { ctx } = mockCtx([services], { display });
  const result = await action.execute!({ domains: "notify" }, ctx) as { count: number };
  assertEquals(result.count, 1);
});

/** The field schemas are verbose and rarely wanted. */
Deno.test("service-list: field schemas can be dropped", async () => {
  const { ctx } = mockCtx([services], { display });
  const result = await action.execute!({ includeFields: false }, ctx) as {
    domains: Array<{ domain: string; services: string[] }>;
  };
  assertEquals(result.domains[0].services, ["turn_on", "turn_off"]);
});

Deno.test("service-list: an empty instance is a count of zero", async () => {
  const { ctx } = mockCtx([ok([])], { display });
  const result = await action.execute!({}, ctx) as { count: number };
  assertEquals(result.count, 0);
});

/** Services come from integrations, so there is no universal catalogue. */
Deno.test("service-list: says the list is per-instance", () => {
  assert(/per-instance/.test(action.description!), action.description);
});
