import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, page } from "./_shared.ts";
import action from "../../actions/document-list.ts";

/** A report built by listing what exists misses the evidence nobody uploaded. */
Deno.test("document-list: tallies the statuses so a caller does not have to", async () => {
  const { ctx, calls } = mockCtx([page([
    { id: "d1", status: "COMPLETE" },
    { id: "d2", status: "MISSING" },
    { id: "d3", status: "MISSING" },
  ])], { display });
  const result = await action.execute!({}, ctx) as {
    count: number;
    statusCounts: Record<string, number>;
  };
  assertEquals(calls[0].url.split("?")[0], "https://api.vanta.com/v1/documents");
  assertEquals(result.count, 3);
  assertEquals(result.statusCounts, { COMPLETE: 1, MISSING: 2 });
});

Deno.test("document-list: status and framework filters are repeated keys", async () => {
  const { ctx, calls } = mockCtx([page([])], { display });
  await action.execute!({ statuses: "MISSING, EXPIRED", frameworks: "soc2" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.getAll("statusMatchesAny"), ["MISSING", "EXPIRED"]);
  assertEquals(q.getAll("frameworkMatchesAny"), ["soc2"]);
});

Deno.test("document-list: says a missing document is in the list, not absent from it", () => {
  assert(/IN this list with a status/.test(action.description!), action.description);
});
