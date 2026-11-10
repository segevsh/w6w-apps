import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newFolder from "../../triggers/new-folder.ts";
import newTag from "../../triggers/new-tag.ts";
import newTransformation from "../../triggers/new-transformation.ts";
import newUploadPreset from "../../triggers/new-upload-preset.ts";

const options = { display: { cloudName: "acme", region: "us" } };

// One row per snapshot trigger: the LITERAL request each check must make, a before/after pair of
// vendor bodies, and the one record the second check must emit.
const cases = [
  {
    trigger: newFolder,
    params: { path: "products" },
    path: "/v1_1/acme/folders/products",
    query: "max_results=500",
    before: { folders: [{ name: "a", path: "products/a", external_id: "f1" }] },
    after: {
      folders: [
        { name: "a", path: "products/a", external_id: "f1" },
        { name: "b", path: "products/b", external_id: "f2" },
      ],
    },
    emitted: [{ name: "b", path: "products/b", external_id: "f2" }],
  },
  {
    trigger: newTag,
    params: { resourceType: "video", prefix: "campaign:" },
    path: "/v1_1/acme/tags/video",
    query: "prefix=campaign%3A&max_results=500",
    before: { tags: ["campaign:a"] },
    after: { tags: ["campaign:a", "campaign:b"] },
    emitted: ["campaign:b"],
  },
  {
    trigger: newTransformation,
    params: {},
    path: "/v1_1/acme/transformations",
    query: "named=true&max_results=500",
    before: { transformations: [{ name: "thumb", named: true }] },
    after: { transformations: [{ name: "thumb", named: true }, { name: "hero", named: true }] },
    emitted: [{ name: "hero", named: true }],
  },
  {
    trigger: newUploadPreset,
    params: {},
    path: "/v1_1/acme/upload_presets",
    query: "max_results=500",
    before: { presets: [{ name: "p1", unsigned: false }] },
    after: { presets: [{ name: "p1", unsigned: false }, { name: "p2", unsigned: true }] },
    emitted: [{ name: "p2", unsigned: true }],
  },
];

for (const c of cases) {
  test(`${c.trigger.key} seeds, emits only the new record, retries identically, requests the list`, async () => {
    const t = c.trigger;
    const seed = mockCtx([{ body: c.before }], options);
    const seeded = await t.poll!({ params: c.params, state: {} }, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    const run = () => {
      const m = mockCtx([{ body: c.after }], options);
      return { m, p: t.poll!({ params: c.params, state: seeded.nextState }, m.ctx) };
    };
    const first = run();
    const out = await first.p;
    assertEquals(out.events, c.emitted);
    assertEquals(await run().p, out);
    const url = new URL(first.m.calls[0].url);
    assertEquals(
      { method: first.m.calls[0].method, path: url.pathname, query: url.search.slice(1) },
      { method: "GET", path: c.path, query: c.query },
    );
  });
}

test("new-folder with no parent lists the top level and pages on next_cursor", async () => {
  const page1 = { folders: [{ name: "a", path: "a" }], next_cursor: "cur1" };
  const page2 = { folders: [{ name: "b", path: "b" }] };
  const m = mockCtx([{ body: page1 }, { body: page2 }], options);
  const seeded = await newFolder.poll!({ params: {}, state: {} }, m.ctx);
  assertEquals(seeded.events, []);
  assertEquals(
    m.calls.map((c) => new URL(c.url).pathname + new URL(c.url).search),
    ["/v1_1/acme/folders?max_results=500", "/v1_1/acme/folders?max_results=500&next_cursor=cur1"],
  );
});
