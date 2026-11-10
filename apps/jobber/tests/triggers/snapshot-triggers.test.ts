import { describe, test } from "node:test";
import nodeAssert from "node:assert/strict";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newProduct from "../../triggers/new-product.ts";
import newProperty from "../../triggers/new-property.ts";
import newUser from "../../triggers/new-user.ts";

interface Case {
  name: string;
  trigger: typeof newProduct;
  field: string;
  params: Record<string, unknown>;
  /** The literal GraphQL variables of the first page. */
  variables: Record<string, unknown>;
}

const cases: Case[] = [
  {
    name: "new-product",
    trigger: newProduct,
    field: "products",
    params: {},
    variables: { showInactive: false, first: 100 },
  },
  {
    name: "new-property",
    trigger: newProperty,
    field: "properties",
    params: { clientId: "client-1" },
    variables: { filter: { clientId: "client-1" }, first: 100 },
  },
  {
    name: "new-user",
    trigger: newUser,
    field: "users",
    params: {},
    variables: { filter: { status: "ACTIVATED" }, first: 100 },
  },
];

const page = (field: string, ids: string[], endCursor?: string) => ({
  body: {
    data: {
      [field]: {
        nodes: ids.map((id) => ({ id })),
        pageInfo: { hasNextPage: endCursor !== undefined, endCursor: endCursor ?? null },
      },
    },
  },
});

for (const c of cases) {
  describe(c.name, () => {
    const run = async (state: unknown, ids: string[]) => {
      const m = mockCtx([page(c.field, ids)]);
      const out = await c.trigger.poll!({ params: c.params, state }, m.ctx);
      return { out, calls: m.calls };
    };

    test("seeds without emitting", async () => {
      const { out } = await run({}, ["a"]);
      assertEquals(out.events, []);
      assertEquals(out.nextState.seeded, true);
    });

    test("emits only the new record, and a retry is identical", async () => {
      const seeded = await run({}, ["a"]);
      const first = await run(seeded.out.nextState, ["a", "b"]);
      assertEquals(first.out.events, [{ id: "b" }]);
      assertEquals((await run(seeded.out.nextState, ["a", "b"])).out, first.out);
    });

    test("requests the literal GraphQL query", async () => {
      const { calls } = await run({}, ["a"]);
      assertEquals(calls.length, 1);
      assertEquals(calls[0].method, "POST");
      assertEquals(calls[0].url, "https://api.getjobber.com/api/graphql");
      assertEquals(JSON.parse(calls[0].body ?? "{}").variables, c.variables);
    });
  });
}

test("new-user follows pageInfo.endCursor across pages", async () => {
  const m = mockCtx([page("users", ["a"], "cur-1"), page("users", ["b"])]);
  const seeded = await newUser.poll!({ params: {}, state: {} }, m.ctx);
  assertEquals(seeded.events, []);
  assertEquals(m.calls.map((call) => JSON.parse(call.body ?? "{}").variables), [
    { filter: { status: "ACTIVATED" }, first: 100 },
    { filter: { status: "ACTIVATED" }, first: 100, after: "cur-1" },
  ]);
  const next = await newUser.poll!(
    { params: {}, state: seeded.nextState },
    mockCtx([page("users", ["a"], "cur-1"), page("users", ["b", "c"])]).ctx,
  );
  assertEquals(next.events, [{ id: "c" }]);
});

test("a connection past the 5000-record ceiling fails loudly instead of truncating", async () => {
  const pages = Array.from({ length: 60 }, (_, i) => page("users", [`u${i}`], `cur-${i}`));
  await nodeAssert.rejects(
    () => newUser.poll!({ params: {}, state: {} }, mockCtx(pages).ctx),
    /more than 5000/,
  );
});
