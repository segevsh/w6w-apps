import { describe, test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newContactList from "../../triggers/new-contact-list.ts";
import newSegment from "../../triggers/new-segment.ts";

const ROOT = "https://api-app2.simpletexting.com/v2";
const wrap = (content: unknown[], totalPages = 1) => ({
  body: { content, totalPages, totalElements: content.length },
});

const cases = [
  {
    name: "new-contact-list",
    trigger: newContactList,
    url: (page: number) => `${ROOT}/api/contact-lists?page=${page}&size=500`,
    mk: (id: string) => ({ listId: id, name: `list ${id}` }),
  },
  {
    name: "new-segment",
    trigger: newSegment,
    url: (page: number) => `${ROOT}/api/contact-segments?page=${page}&size=500`,
    mk: (id: string) => ({ segmentId: id, name: `segment ${id}` }),
  },
];

for (const c of cases) {
  const input = (state: unknown) => ({ params: {}, subscriptionId: "s", state }) as never;
  describe(c.name, () => {
    test("seeds, emits only the added record, retries identically, sends the literal request", async () => {
      const seed = mockCtx([wrap([c.mk("a")])]);
      const seeded = await c.trigger.poll!(input({}), seed.ctx);
      assertEquals(seeded.events, []);
      assertEquals(seed.calls[0].method, "GET");
      assertEquals(seed.calls[0].url, c.url(0));
      const run = () => mockCtx([wrap([c.mk("b"), c.mk("a")])]);
      const out = await c.trigger.poll!(input(seeded.nextState), run().ctx);
      const retry = await c.trigger.poll!(input(seeded.nextState), run().ctx);
      assertEquals(out.events, [c.mk("b")]);
      assertEquals(retry, out);
    });

    test("reads every page so a record on page 2 is seen", async () => {
      const ctx = mockCtx([wrap([c.mk("a")], 2), wrap([c.mk("b")], 2)]);
      const seeded = await c.trigger.poll!(input({}), ctx.ctx);
      assertEquals(ctx.calls.map((x) => x.url), [c.url(0), c.url(1)]);
      const out = await c.trigger.poll!(
        input(seeded.nextState),
        mockCtx([wrap([c.mk("a")], 2), wrap([c.mk("b"), c.mk("c")], 2)]).ctx,
      );
      assertEquals(out.events, [c.mk("c")]);
    });
  });
}
