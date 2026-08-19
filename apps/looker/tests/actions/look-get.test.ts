import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/look-get.ts";

const D = { display: { host: "https://mycompany.cloud.looker.com" } };

const look = {
  title: "Weekly revenue",
  public: true,
  updated_at: "2026-08-01T00:00:00Z",
  query: {
    model: "ecommerce",
    view: "orders",
    fields: ["orders.count"],
    filters: { "orders.created_date": "last 7 days" },
    limit: "500",
  },
};

/** The definition is what a workflow is really depending on. */
Deno.test("look-get: returns the query behind the Look", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: look }], D);
  const result = await action.execute({ lookId: "1" }, ctx) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).pathname, "/api/4.0/looks/1");
  assertEquals(result.model, "ecommerce");
  assertEquals(result.explore, "orders", "the API's `view` is the Explore");
  assertEquals(result.fields, ["orders.count"]);
  assertEquals(result.isPublic, true);
  assertEquals(result.unlimited, false);
});

/** Looker's own documentation: -1 means unlimited. */
Deno.test("look-get: reads -1 and a missing limit as unbounded", async () => {
  for (const limit of ["-1", undefined, ""]) {
    const { ctx, logs } = mockCtx([{
      status: 200,
      body: { ...look, query: { ...look.query, limit } },
    }], D);
    const result = await action.execute({ lookId: "1" }, ctx) as Record<string, unknown>;
    assertEquals(result.unlimited, true, `limit ${JSON.stringify(limit)}`);
    assert(logs.some((l) => /no row limit of its own/.test(l.message)), JSON.stringify(logs));
  }
});

/** A deleted Look still answers a fetch, so fetching is not an existence test. */
Deno.test("look-get: warns that a soft-deleted Look still answers here", async () => {
  const { ctx, logs } = mockCtx([{ status: 200, body: { ...look, deleted: true } }], D);
  const result = await action.execute({ lookId: "9" }, ctx) as Record<string, unknown>;
  assertEquals(result.deleted, true);
  assert(
    logs.some((l) => l.level === "warn" && /still answers a fetch/.test(l.message)),
    JSON.stringify(logs),
  );
});

Deno.test("look-get: requires an id", async () => {
  const { ctx, calls } = mockCtx([], D);
  await assertRejects(async () => await action.execute({}, ctx), Error, "`lookId` is required");
  assertEquals(calls.length, 0);
});

Deno.test("look-get: an id with a slash cannot escape the path", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: look }], D);
  await action.execute({ lookId: "1/../users" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/4.0/looks/1%2F..%2Fusers");
});
