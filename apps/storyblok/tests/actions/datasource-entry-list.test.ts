import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/datasource-entry-list.ts";

const D = { display: { credentialKind: "delivery", region: "eu" } };
const entries = {
  status: 200,
  body: {
    datasource_entries: [
      { id: 1, name: "Germany", value: "de" },
      { id: 2, name: "France", value: "fr" },
    ],
    cv: 99,
  },
  headers: { total: "2" },
};

/** This is what turns `de` into `Germany`. */
Deno.test("datasource-entry-list: builds the value-to-name lookup", async () => {
  const { ctx, calls } = mockCtx([entries], D);
  const result = await action.execute({ datasource: "countries" }, ctx) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).searchParams.get("datasource"), "countries");
  assertEquals(result.map, { de: "Germany", fr: "France" });
  assertEquals(result.values, ["de", "fr"]);
});

/** A dimension value takes precedence over the default name. */
Deno.test("datasource-entry-list: a dimension replaces the names it has", async () => {
  const { ctx, calls, logs } = mockCtx([{
    status: 200,
    body: {
      datasource_entries: [
        { name: "Germany", value: "de", dimension_value: "Deutschland" },
        { name: "France", value: "fr", dimension_value: null },
      ],
    },
  }], D);
  const result = await action.execute({ datasource: "countries", dimension: "de" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(new URL(calls[0].url).searchParams.get("dimension"), "de");
  assertEquals(result.map, { de: "Deutschland", fr: "France" });
  assert(
    logs.some((l) => /indistinguishable from being translated/.test(l.message)),
    JSON.stringify(logs),
  );
});

Deno.test("datasource-entry-list: pages to 1000, unlike stories", async () => {
  const { ctx, calls } = mockCtx([entries], D);
  await action.execute({ datasource: "countries" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("per_page"), "1000");
});

Deno.test("datasource-entry-list: requires a datasource", async () => {
  const { ctx, calls } = mockCtx([], D);
  await assertRejects(async () => await action.execute({}, ctx), Error, "`datasource` is required");
  assertEquals(calls.length, 0);
});
