import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { ok } from "./_shared.ts";
import action from "../../actions/connection-test.ts";

const tests = (results: Array<{ title: string; status: string }>) => ok({ setup_tests: results });

Deno.test("connection-test: posts and reports every test passing", async () => {
  const { ctx, calls } = mockCtx([tests([
    { title: "Connecting to host", status: "PASSED" },
    { title: "Validating credentials", status: "PASSED" },
  ])]);
  const result = await action.execute!({ connectionId: "c1" }, ctx) as {
    allPassed: boolean;
    failed: unknown[];
  };
  assertEquals(calls[0].url, "https://api.fivetran.com/v1/connections/c1/test");
  assertEquals(calls[0].method, "POST");
  assertEquals(result.allPassed, true);
  assertEquals(result.failed.length, 0);
});

/** "Credentials fine, network not" is a different Monday from the reverse. */
Deno.test("connection-test: names the tests that failed", async () => {
  const { ctx } = mockCtx([tests([
    { title: "Connecting to host", status: "FAILED" },
    { title: "Validating credentials", status: "PASSED" },
  ])]);
  const result = await action.execute!({ connectionId: "c1" }, ctx) as {
    allPassed: boolean;
    failed: Array<{ title: string }>;
  };
  assertEquals(result.allPassed, false);
  assertEquals(result.failed[0].title, "Connecting to host");
});

Deno.test("connection-test: no tests at all does not report success", async () => {
  const { ctx } = mockCtx([tests([])]);
  const result = await action.execute!({ connectionId: "c1" }, ctx) as { allPassed: boolean };
  assertEquals(result.allPassed, false);
});

Deno.test("connection-test: trusting certificates is opt-in", async () => {
  const off = mockCtx([tests([])]);
  await action.execute!({ connectionId: "c1" }, off.ctx);
  assertEquals(JSON.parse(off.calls[0].body!), {});

  const on = mockCtx([tests([])]);
  await action.execute!({ connectionId: "c1", trustCertificates: true }, on.ctx);
  assertEquals(JSON.parse(on.calls[0].body!), { trust_certificates: true });
});

Deno.test("connection-test: needs a connection id", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(async () => await action.execute!({}, ctx), Error, "connectionId");
  assertEquals(calls.length, 0);
});

/** Setup tests have their own much tighter budget. */
Deno.test("connection-test: says it is a repair step rather than a monitor", () => {
  assert(/repair step, not a monitor/.test(action.description!), action.description);
});
