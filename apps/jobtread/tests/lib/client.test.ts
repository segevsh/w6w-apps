import { assertEquals, assertRejects } from "@std/assert";
import { connectionArgs, JobTreadClient } from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("JobTreadClient.query: posts {query} to the single /pave endpoint", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { organization: { id: "abc" } } }]);
  const client = new JobTreadClient(ctx);
  const result = await client.query({ organization: { $: { id: "abc" }, id: {} } });

  assertEquals(calls.length, 1);
  assertEquals(calls[0].url, "https://api.jobtread.com/pave");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { query: { organization: { $: { id: "abc" }, id: {} } } });
  assertEquals(result, { organization: { id: "abc" } });
});

Deno.test("JobTreadClient.query: a non-2xx plain-text body becomes a thrown Error carrying the vendor message", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    headers: { "content-type": "text/plain; charset=utf-8" },
    body: "Supplied key is invalid or expired",
  }]);
  const client = new JobTreadClient(ctx);
  await assertRejects(
    () => client.query({ currentGrant: { id: {} } }),
    Error,
    "Supplied key is invalid or expired",
  );
});

Deno.test("connectionArgs: only sets keys the caller actually provided", () => {
  assertEquals(connectionArgs({}), {});
  assertEquals(connectionArgs({ size: 10 }), { size: 10 });
  assertEquals(
    connectionArgs({ size: 5, page: "p1", where: ["type", "=", "customer"], sortBy: [{ field: "name" }] }),
    { size: 5, page: "p1", where: ["type", "=", "customer"], sortBy: [{ field: "name" }] },
  );
});

Deno.test("connectionArgs: ignores undefined/null where and sortBy rather than sending null", () => {
  assertEquals(connectionArgs({ where: undefined, sortBy: null }), {});
});
