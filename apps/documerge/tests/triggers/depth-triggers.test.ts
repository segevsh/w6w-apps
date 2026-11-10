import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newDocumentDeliveryMethod from "../../triggers/new-document-delivery-method.ts";
import newRoute from "../../triggers/new-route.ts";
import newRouteDeliveryMethod from "../../triggers/new-route-delivery-method.ts";
import newRouteRule from "../../triggers/new-route-rule.ts";

const API = "https://app.documerge.ai";
const page = (...items: unknown[]) => ({ body: { data: items } });

// One row per snapshot trigger: params, the LITERAL URL each check must GET, and the records.
const cases = [
  { trigger: newRoute, params: {}, url: `${API}/api/routes` },
  { trigger: newRouteRule, params: { routeId: 13 }, url: `${API}/api/routes/13/rules` },
  {
    trigger: newDocumentDeliveryMethod,
    params: { documentId: 7 },
    url: `${API}/api/documents/delivery-methods/7`,
  },
  {
    trigger: newRouteDeliveryMethod,
    params: { routeId: 13 },
    url: `${API}/api/routes/delivery-methods/13`,
  },
];

for (const c of cases) {
  test(`${c.trigger.key}: seeds, emits only the new record, retries identically, lists the parent`, async () => {
    const seed = mockCtx([page({ id: 1 })]);
    const seeded = await c.trigger.poll!({ params: c.params, state: {} }, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(seed.calls[0].method, "GET");
    assertEquals(seed.calls[0].url, c.url);
    const run = () => {
      const m = mockCtx([page({ id: 1 }, { id: 2 })]);
      return { m, p: c.trigger.poll!({ params: c.params, state: seeded.nextState }, m.ctx) };
    };
    const first = run();
    const out = await first.p;
    assertEquals(out.events, [{ id: 2 }]);
    assertEquals(await run().p, out);
    assertEquals(first.m.calls[0].url, c.url);
  });
}

test("new-route-rule keys a row without an id by its content", async () => {
  const params = { routeId: 13 };
  const seeded = await newRouteRule.poll!(
    { params, state: {} },
    mockCtx([page({ field: "a" })]).ctx,
  );
  const out = await newRouteRule.poll!(
    { params, state: seeded.nextState },
    mockCtx([page({ field: "a" }, { field: "b" })]).ctx,
  );
  assertEquals(out.events, [{ field: "b" }]);
});
