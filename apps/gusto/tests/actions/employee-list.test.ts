import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/employee-list.ts";

const conn = { display: { environment: "production", companyId: "co-1" } };

Deno.test("employee-list: reads the company's employees", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ uuid: "e1" }] }], conn);
  assertEquals(await action.execute!({}, ctx), [{ uuid: "e1" }]);
  assertEquals(new URL(calls[0].url).pathname, "/v1/companies/co-1/employees");
});

/** Leavers vanish from the default list rather than being marked. */
Deno.test("employee-list: terminated people need asking for", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }], conn);
  await action.execute!({ terminated: "true" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("terminated"), "true");

  const dflt = mockCtx([{ status: 200, body: [] }], conn);
  await action.execute!({}, dflt.ctx);
  assertEquals(new URL(dflt.calls[0].url).searchParams.get("terminated"), null);
});

Deno.test("employee-list: include pulls nested data in the same request", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }], conn);
  await action.execute!({ include: "all_compensations" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("include"), "all_compensations");
});

Deno.test("employee-list: the description warns that a sync misses leavers", () => {
  assert(/EXCLUDED by default/.test(action.description!), action.description);
});
