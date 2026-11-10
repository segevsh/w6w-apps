import { describe, test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";
import newForm from "../../triggers/new-form.ts";
import newBrand from "../../triggers/new-brand.ts";
import newTag from "../../triggers/new-tag.ts";

const base = { subscriptionId: "sub-1", params: {} };

describe("new-form (newest first)", () => {
  const forms = (ids: string[]) => page(ids.map((form_id) => ({ form_id })));
  test("seeds, requests the newest page, emits the new form, retries identically", async () => {
    const m = mockCtx([{ body: forms(["f1"]) }]);
    const seeded = await newForm.poll!({ ...base, state: {} }, m.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(m.calls[0].method, "GET");
    assertEquals(pathOf(m.calls[0].url), "/forms");
    assertEquals(queryOf(m.calls[0].url), { limit: "50", offset: "0" });
    const a = await newForm.poll!(
      { ...base, state: seeded.nextState },
      mockCtx([{ body: forms(["f2", "f1"]) }]).ctx,
    );
    const b = await newForm.poll!(
      { ...base, state: seeded.nextState },
      mockCtx([{ body: forms(["f2", "f1"]) }]).ctx,
    );
    assertEquals(a.events, [{ form_id: "f2" }]);
    assertEquals(a, b);
  });
});

describe("new-brand (newest first)", () => {
  const brand = (id: string) => ({
    branding_id: id,
    name: id,
    logo_url: "https://media.example/logo.png?token=test-secret",
  });
  test("seeds, requests /brandings, emits the new brand without its signed logo URL", async () => {
    const m = mockCtx([{ body: page([brand("b1")]) }]);
    const seeded = await newBrand.poll!({ ...base, state: {} }, m.ctx);
    assertEquals(seeded.events, []);
    assertEquals(m.calls[0].method, "GET");
    assertEquals(pathOf(m.calls[0].url), "/brandings");
    assertEquals(queryOf(m.calls[0].url), {});
    const body = () => [{ body: page([brand("b2"), brand("b1")]) }];
    const a = await newBrand.poll!({ ...base, state: seeded.nextState }, mockCtx(body()).ctx);
    const b = await newBrand.poll!({ ...base, state: seeded.nextState }, mockCtx(body()).ctx);
    assertEquals(a.events, [{ branding_id: "b2", name: "b2" }]);
    assertEquals(JSON.stringify(a.events).includes("test-secret"), false);
    assertEquals(a, b);
  });
});

describe("new-tag (snapshot)", () => {
  const tags = (n: number, from = 0) =>
    page(Array.from({ length: n }, (_, i) => ({ tag_id: `t${from + i}`, title: `T${from + i}` })));
  test("seeds, reads every page by offset, emits only the added tag", async () => {
    const m = mockCtx([{ body: tags(50) }, { body: tags(1, 50) }]);
    const seeded = await newTag.poll!({ ...base, state: {} }, m.ctx);
    assertEquals(seeded.events, []);
    assertEquals(pathOf(m.calls[0].url), "/tags");
    assertEquals(queryOf(m.calls[0].url), { limit: "50", offset: "0" });
    assertEquals(queryOf(m.calls[1].url), { limit: "50", offset: "50" });
    const next = () => [{ body: tags(50) }, { body: tags(2, 50) }];
    const a = await newTag.poll!({ ...base, state: seeded.nextState }, mockCtx(next()).ctx);
    const b = await newTag.poll!({ ...base, state: seeded.nextState }, mockCtx(next()).ctx);
    assertEquals(a.events, [{ tag_id: "t51", title: "T51" }]);
    assertEquals(a, b);
  });
});
