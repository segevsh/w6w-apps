import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/lookup-list.ts";

const display = {};

Deno.test("lookup-list: maps each choice to its own endpoint", async () => {
  const cases: Array<[string, string]> = [
    ["countries", "/rest/lookups/countries"],
    ["currencies", "/rest/lookups/currencies"],
    ["job-titles", "/rest/lookups/job-titles"],
    ["seniorities", "/rest/lookups/seniorities"],
    ["time-off-types", "/rest/lookups/time-off-types"],
  ];
  for (const [lookup, path] of cases) {
    const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }], { display });
    await action.execute!({ lookup }, ctx);
    assertEquals(new URL(calls[0].url).pathname, path, lookup);
  }
});

/** A typo becomes a named error, not a 404 on a URL the caller never wrote. */
Deno.test("lookup-list: an unknown lookup is refused with the valid names", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ lookup: "counties" }, ctx),
    Error,
    "unknown lookup",
  );
  assertEquals(calls.length, 0);
});
