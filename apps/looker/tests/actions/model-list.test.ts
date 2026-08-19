import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/model-list.ts";

const D = { display: { host: "https://mycompany.cloud.looker.com" } };

const models = [
  {
    name: "ecommerce",
    allowed_db_connection_names: ["warehouse"],
    explores: [{ name: "orders" }, { name: "users", hidden: true }],
  },
  { name: "finance", allowed_db_connection_names: [], explores: [{ name: "ledger" }] },
];

/** `model/explore` is exactly what a query needs, so it is assembled here. */
Deno.test("model-list: builds the model/explore pairs a query needs", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: models }], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).pathname, "/api/4.0/lookml_models");
  assertEquals(result.explores, ["ecommerce/orders", "ecommerce/users", "finance/ledger"]);
  assertEquals(result.exploreCount, 3);
  assertEquals(result.names, ["ecommerce", "finance"]);
});

/** Defined and unable to run anything — a config state that fails at query time. */
Deno.test("model-list: names models with no database connection", async () => {
  const { ctx } = mockCtx([{ status: 200, body: models }], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.modelsWithoutConnection, ["finance"]);
});

Deno.test("model-list: excludes empty models and includes hidden Explores by default", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }], D);
  await action.execute({}, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("exclude_empty"), "true");
  assertEquals(q.get("exclude_hidden"), "false");
});

Deno.test("model-list: the toggles are passed through", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }], D);
  await action.execute({ excludeEmpty: false, excludeHidden: true }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("exclude_empty"), "false");
  assertEquals(q.get("exclude_hidden"), "true");
});

/** The API's `view` is this list's Explore name. */
Deno.test("model-list: says the Explore names here are the query API's view", () => {
  assert(/calls `view`/.test(action.description!), action.description);
  assertEquals(action.type, "search");
});
