import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/find-employees.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("find-employees: POSTs the titles as an array and wraps the array response", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ "name": "John", "jobTitle": "CEO" }] }]);
  const out = await action.execute!(
    { "website": "findymail.com", "job_titles": "CEO, CTO", "count": 2 } as never,
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://app.findymail.com");
  assertEquals(url.pathname, "/api/search/employees");
  assertEquals(calls[0].method, "POST");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "website": "findymail.com",
    "job_titles": ["CEO", "CTO"],
    "count": 2,
  });
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(out, { "employees": [{ "name": "John", "jobTitle": "CEO" }] });
});

Deno.test("find-employees: rejects an empty title list before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(async () =>
    await action.execute!({ "website": "a.com", "job_titles": "" } as never, ctx)
  );
  assert((err as Error).message.includes("at least one job title"));
  assertEquals(calls.length, 0);
});
