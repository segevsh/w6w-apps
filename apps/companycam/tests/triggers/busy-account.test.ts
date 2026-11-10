import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx, type MockResponse } from "../_helpers.ts";
import newPhoto from "../../triggers/new-photo.ts";
import newVideo from "../../triggers/new-video.ts";
import { clock } from "../../lib/triggers.ts";

// B1 (eval round 1): new-photo / new-video re-read the last 2 h on every window, so on a busy
// account the de-duplication memory must hold every id that window returns. All records here are
// uploaded after the seed and served again by every window; none may be emitted twice.
const NOW = Date.UTC(2026, 10, 10, 12, 0, 0);
const SEC = NOW / 1000;
const input = { params: {}, subscriptionId: "sub-1" };

const cases = [
  { trigger: newPhoto, paging: "cursor" },
  { trigger: newVideo, paging: "page" },
] as const;

for (const { trigger, paging } of cases) {
  for (const total of [1500, 3000]) {
    test(`${trigger.key}: ${total} uploads inside the 2 h overlap are each emitted exactly once`, async () => {
      const all = Array.from({ length: total }, (_, i) => ({
        id: `r${i}`,
        created_at: SEC + 60 + (i % 600),
        captured_at: SEC + 30,
      }));
      const slice = (from: number) => {
        const end = Math.min(from + 100, total);
        return { end, items: all.slice(from, end) };
      };
      clock.now = () => NOW;
      let state: unknown =
        (await trigger.poll!({ ...input, state: {} }, mockCtx([]).ctx)).nextState;
      const count = new Map<string, number>();
      for (let k = 1; k <= 40; k++) {
        clock.now = () => NOW + k * 300_000;
        const resume = (state as { resume?: { pos?: string | number } }).resume;
        let pos = resume?.pos !== undefined ? Number(resume.pos) : paging === "page" ? 1 : 0;
        const queue: MockResponse[] = [];
        for (let p = 0; p < 5; p++) {
          const start = paging === "page" ? (pos - 1) * 100 : pos;
          const { end, items } = slice(start);
          const more = paging === "page" ? items.length >= 100 : end < total;
          queue.push({
            body: items,
            headers: {
              "content-type": "application/json",
              ...(paging === "cursor" && more ? { "x-next-cursor": String(end) } : {}),
            },
          });
          if (!more) break;
          pos = paging === "page" ? pos + 1 : end;
        }
        const r = await trigger.poll!({ ...input, state }, mockCtx(queue).ctx);
        state = r.nextState;
        for (const e of r.events as { id: string }[]) count.set(e.id, (count.get(e.id) ?? 0) + 1);
      }
      assertEquals(count.size, total);
      assertEquals([...count.values()].filter((n) => n > 1).length, 0);
    });
  }
}
