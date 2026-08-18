import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/entity-search.ts";

const results = ok({
  actor: {
    entitySearch: {
      count: 42,
      results: {
        entities: [
          { guid: "g1", name: "checkout", reporting: true },
          { guid: "g2", name: "checkout-old", reporting: false },
        ],
        nextCursor: "c1",
      },
    },
  },
});

Deno.test("entity-search: builds the entity-search clause from the friendly fields", async () => {
  const { ctx, calls } = mockCtx([results], { display });
  await action.execute!({ name: "checkout", domain: "APM", type: "APPLICATION" }, ctx);
  assertEquals(
    JSON.parse(calls[0].body!).variables.query,
    "name LIKE 'checkout' AND domain = 'APM' AND type = 'APPLICATION'",
  );
});

Deno.test("entity-search: a raw query is wrapped and combined", async () => {
  const { ctx, calls } = mockCtx([results], { display });
  await action.execute!({ query: "tags.env = 'prod'", domain: "APM" }, ctx);
  assertEquals(
    JSON.parse(calls[0].body!).variables.query,
    "(tags.env = 'prod') AND domain = 'APM'",
  );
});

/** The syntax is single-quoted, so a quote in a value would break the clause. */
Deno.test("entity-search: quotes in a value are stripped rather than breaking the clause", async () => {
  const { ctx, calls } = mockCtx([results], { display });
  await action.execute!({ name: "it's broken" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).variables.query, "name LIKE 'its broken'");
});

/** An entity that stopped reporting stays searchable for about eight days. */
Deno.test("entity-search: entities that stopped reporting are counted and can be dropped", async () => {
  const kept = mockCtx([results], { display });
  const withAll = await action.execute!({ name: "checkout" }, kept.ctx) as {
    count: number;
    notReporting: number;
  };
  assertEquals(withAll.count, 2);
  assertEquals(withAll.notReporting, 1);

  const dropped = mockCtx([results], { display });
  const without = await action.execute!({ name: "checkout", reportingOnly: true }, dropped.ctx) as {
    count: number;
    notReporting: number;
  };
  assertEquals(without.count, 1);
  assertEquals(without.notReporting, 1, "still reported, so the filtering is visible");
});

Deno.test("entity-search: the GUIDs are lifted out, since everything else needs them", async () => {
  const { ctx } = mockCtx([results], { display });
  const result = await action.execute!({ name: "checkout" }, ctx) as { guids: string[] };
  assertEquals(result.guids, ["g1", "g2"]);
});

Deno.test("entity-search: the total and cursor come back for paging", async () => {
  const { ctx } = mockCtx([results], { display });
  const result = await action.execute!({ name: "checkout" }, ctx) as {
    total: number;
    cursor: string;
  };
  assertEquals(result.total, 42);
  assertEquals(result.cursor, "c1");
});

Deno.test("entity-search: no criteria at all is refused", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "search by");
  assertEquals(calls.length, 0);
});

Deno.test("entity-search: logs counts, never the names", async () => {
  const { ctx, logs } = mockCtx([results], { display });
  await action.execute!({ name: "checkout" }, ctx);
  assert(!JSON.stringify(logs).includes("checkout"), JSON.stringify(logs));
  assertEquals(logs[0].data, { count: 2, total: 42, notReporting: 1 });
});

/** Three query languages in one API is worth stating. */
Deno.test("entity-search: says the syntax is neither NRQL nor SQL", () => {
  assert(/not NRQL and not SQL/.test(
    (action.params as Array<{ key: string; hint?: string }>).find((p) => p.key === "query")!.hint!,
  ));
});
