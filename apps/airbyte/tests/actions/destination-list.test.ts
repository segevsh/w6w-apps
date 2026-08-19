import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/destination-list.ts";

const D = { display: { host: "https://api.airbyte.com" } };
const destinations = {
  status: 200,
  body: {
    data: [
      { destinationId: "d1", name: "Warehouse", destinationType: "snowflake" },
      { destinationId: "d2", name: "Lake", destinationType: "s3" },
    ],
  },
};

Deno.test("destination-list: returns the ids and counts the types", async () => {
  const { ctx, calls } = mockCtx([destinations], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).pathname, "/v1/destinations");
  assertEquals(result.ids, ["d1", "d2"]);
  assertEquals(result.byType, { snowflake: 1, s3: 1 });
});

Deno.test("destination-list: the type filter is applied here", async () => {
  const { ctx } = mockCtx([destinations], D);
  const result = await action.execute({ destinationType: "snowflake" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(result.count, 1);
  assertEquals(result.names, ["Warehouse"]);
});

/** Several connections usually share one destination. */
Deno.test("destination-list: says a destination is the blast radius", () => {
  assert(/blast radius of any change/.test(action.description!), action.description);
});
