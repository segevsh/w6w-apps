import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/audit-log-list.ts";

const conn = { display: { projectKey: "default" } };

Deno.test("audit-log-list: reads the account-wide audit log", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { items: [{ _id: "a" }] } }], conn);
  assertEquals(await action.execute!({}, ctx), [{ _id: "a" }]);
  assertEquals(new URL(calls[0].url).pathname, "/api/v2/auditlog");
});

/** An ISO timestamp is accepted by the API and simply does not filter. */
Deno.test("audit-log-list: an ISO timestamp is refused before any request", async () => {
  for (const key of ["after", "before"]) {
    const { ctx, calls } = mockCtx([], conn);
    await assertRejects(
      async () => await action.execute!({ [key]: "2026-08-18T00:00:00Z" }, ctx),
      Error,
      "epoch milliseconds",
    );
    assertEquals(calls.length, 0);
  }
});

Deno.test("audit-log-list: epoch milliseconds and a spec reach the wire", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { items: [] } }], conn);
  await action.execute!({
    after: "1787000000000",
    spec: "proj/default:env/production:flag/new-checkout",
  }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("after"), "1787000000000");
  assertEquals(q.get("spec"), "proj/default:env/production:flag/new-checkout");
  assert(action.description!.includes("account-wide"), action.description);
});
