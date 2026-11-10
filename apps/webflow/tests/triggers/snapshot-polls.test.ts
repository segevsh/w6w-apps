import { test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newCollection from "../../triggers/new-collection.ts";
import newProduct from "../../triggers/new-product.ts";
import newSite from "../../triggers/new-site.ts";

type Poll = (i: unknown, ctx: unknown) => Promise<{ events: unknown[]; nextState: unknown }>;
const API = "https://api.webflow.com/v2";

const CASES = [
  {
    name: "new-collection",
    trigger: newCollection,
    params: { siteId: "site1" },
    respond: (rows: unknown[]) => ({ collections: rows }),
    url: `${API}/sites/site1/collections`,
  },
  {
    name: "new-site",
    trigger: newSite,
    params: {},
    respond: (rows: unknown[]) => ({ sites: rows }),
    url: `${API}/sites`,
  },
] as const;

for (const c of CASES) {
  const row = (id: string, name: string) => ({ id, displayName: name });
  const input = { params: c.params, subscriptionId: "sub-1" };
  const run = (state: unknown, rows: unknown[]) => {
    const m = mockCtx([{ body: c.respond(rows) }]);
    return { m, out: (c.trigger.poll as unknown as Poll)({ ...input, state }, m.ctx) };
  };

  test(`${c.name}: seeds, emits only an added row (not an edit), retries idempotently, sends the literal request`, async () => {
    const seed = run({}, [row("1", "A")]);
    const seeded = await seed.out;
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    assertEquals([seed.m.calls[0].method, seed.m.calls[0].url], ["GET", c.url]);

    const page = [row("1", "A (renamed)"), row("2", "B")];
    const first = await run(seeded.nextState, page).out;
    const retry = await run(seeded.nextState, page).out;
    assertEquals(first.events, [{ change: "added", key: "2", values: row("2", "B") }]);
    assertEquals(retry, first);
  });
}

// ---- new-product: walks pages (limit 100) because the endpoint has no sort or created filter ----

const product = (id: string) => ({ product: { id, fieldData: { name: `P${id}` } }, skus: [] });
const pageOf = (ids: string[], total: number, offset = 0) => ({
  body: { items: ids.map(product), pagination: { limit: 100, offset, total } },
});
const prodInput = { params: { siteId: "site1" }, subscriptionId: "sub-1" };
const ids = (from: number, n: number) => Array.from({ length: n }, (_, i) => String(from + i));

test("new-product: seed walks every page, emits nothing; the literal requests carry limit=100 and offset", async () => {
  const m = mockCtx([pageOf(ids(0, 100), 150), pageOf(ids(100, 50), 150, 100)]);
  const seeded = await (newProduct.poll as unknown as Poll)({ ...prodInput, state: {} }, m.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(m.calls.map((x) => [x.method, x.url]), [
    ["GET", `${API}/sites/site1/products?limit=100&offset=0`],
    ["GET", `${API}/sites/site1/products?limit=100&offset=100`],
  ]);
});

test("new-product: a product added since the seed is emitted once, on any page; retry is idempotent", async () => {
  const m0 = mockCtx([pageOf(ids(0, 100), 150), pageOf(ids(100, 50), 150, 100)]);
  const seeded = await (newProduct.poll as unknown as Poll)({ ...prodInput, state: {} }, m0.ctx);
  const responses = () => [pageOf(ids(0, 100), 151), pageOf([...ids(100, 50), "new1"], 151, 100)];
  const a = await (newProduct.poll as unknown as Poll)(
    { ...prodInput, state: seeded.nextState },
    mockCtx(responses()).ctx,
  );
  const b = await (newProduct.poll as unknown as Poll)(
    { ...prodInput, state: seeded.nextState },
    mockCtx(responses()).ctx,
  );
  assertEquals(a.events, [{ change: "added", key: "new1", values: product("new1") }]);
  assertEquals(b, a);
});

test("new-product: a product listed on two pages (catalog shifted mid-walk) is counted once", async () => {
  const m0 = mockCtx([pageOf(["1", "2"], 2)]);
  const seeded = await (newProduct.poll as unknown as Poll)({ ...prodInput, state: {} }, m0.ctx);
  const m = mockCtx([pageOf(ids(0, 100).map((i) => `x${i}`), 101), pageOf(["x0"], 101, 100)]);
  const out = await (newProduct.poll as unknown as Poll)(
    { ...prodInput, state: seeded.nextState },
    m.ctx,
  );
  assertEquals(out.events.length, 100);
});

test("new-product: more than 5000 products fails the check naming the cap", async () => {
  const pages = Array.from({ length: 50 }, (_, i) => pageOf(ids(i * 100, 100), 5100, i * 100));
  const m = mockCtx(pages);
  await assertRejects(
    () => (newProduct.poll as unknown as Poll)({ ...prodInput, state: {} }, m.ctx),
    Error,
    "5000 products",
  );
  assert(m.calls.length === 50);
});
