import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newFolder from "../../triggers/new-folder.ts";
import newOrUpdatedFolder from "../../triggers/new-or-updated-folder.ts";
import newShowcase from "../../triggers/new-showcase.ts";
import newOrUpdatedShowcase from "../../triggers/new-or-updated-showcase.ts";
import newFolderVideo from "../../triggers/new-folder-video.ts";
import newFolderItem from "../../triggers/new-folder-item.ts";
import newShowcaseVideo from "../../triggers/new-showcase-video.ts";
import newComment from "../../triggers/new-comment.ts";
import newSearchVideo from "../../triggers/new-search-video.ts";

const rec = (uri: string, extra: Record<string, unknown> = {}) => ({ uri, ...extra });
const itemOf = (id: string) => ({ type: "video", video: { uri: `/videos/${id}` } });

// Table-driven: the newest-first (pollFromListAction) triggers share one case set.
const specs = [
  {
    name: "new-folder",
    trigger: newFolder,
    params: {},
    url: "https://api.vimeo.com/me/projects?sort=date&direction=desc&page=1&per_page=100",
    mk: (id: string) => rec(`/users/1/projects/${id}`),
  },
  {
    name: "new-or-updated-folder",
    trigger: newOrUpdatedFolder,
    params: {},
    url: "https://api.vimeo.com/me/projects?sort=modified_time&direction=desc&page=1&per_page=100",
    mk: (id: string) =>
      rec(`/users/1/projects/${id}`, { modified_time: "2026-11-09T12:00:00+00:00" }),
  },
  {
    name: "new-showcase",
    trigger: newShowcase,
    params: {},
    url: "https://api.vimeo.com/me/albums?sort=date&direction=desc&page=1&per_page=100",
    mk: (id: string) => rec(`/users/1/albums/${id}`),
  },
  {
    name: "new-or-updated-showcase",
    trigger: newOrUpdatedShowcase,
    params: {},
    url: "https://api.vimeo.com/me/albums?sort=last_modified&direction=desc&page=1&per_page=100",
    mk: (id: string) =>
      rec(`/users/1/albums/${id}`, { modified_time: "2026-11-09T12:00:00+00:00" }),
  },
  {
    name: "new-folder-video",
    trigger: newFolderVideo,
    params: { folderId: "555" },
    url:
      "https://api.vimeo.com/me/projects/555/videos?sort=date&direction=desc&page=1&per_page=100",
    mk: (id: string) => rec(`/videos/${id}`),
  },
  {
    name: "new-folder-item",
    trigger: newFolderItem,
    params: { folderId: "555" },
    url: "https://api.vimeo.com/me/projects/555/items?sort=date&direction=desc&page=1&per_page=100",
    mk: itemOf,
  },
  {
    name: "new-showcase-video",
    trigger: newShowcaseVideo,
    params: { showcaseId: "777" },
    url: "https://api.vimeo.com/me/albums/777/videos?sort=date&direction=desc&page=1&per_page=100",
    mk: (id: string) => rec(`/videos/${id}`),
  },
  {
    name: "new-comment",
    trigger: newComment,
    params: { videoId: "258684937" },
    url: "https://api.vimeo.com/videos/258684937/comments?direction=desc&page=1&per_page=100",
    mk: (id: string) => rec(`/videos/258684937/comments/${id}`),
  },
  {
    name: "new-search-video",
    trigger: newSearchVideo,
    params: { query: "staff picks" },
    url:
      "https://api.vimeo.com/videos?query=staff+picks&sort=date&direction=desc&page=1&per_page=100",
    mk: (id: string) => rec(`/videos/${id}`),
  },
];

for (const { name, trigger, params, url, mk } of specs) {
  const input = { params, subscriptionId: "sub-1" };
  const ctx = (data: unknown[]) => mockCtx([{ body: { data } }]);

  test(`${name}: seeds, emits only the new record, retries idempotently, asks newest first`, async () => {
    const seed = ctx([mk("a")]);
    const s = await trigger.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(s.events, []);
    assertEquals((s.nextState as { seeded: boolean }).seeded, true);
    assertEquals({ method: seed.calls[0].method, url: seed.calls[0].url }, { method: "GET", url });
    const n = await trigger.poll!({ ...input, state: s.nextState }, ctx([mk("b"), mk("a")]).ctx);
    assertEquals(n.events, [mk("b")]);
    assertEquals(
      await trigger.poll!({ ...input, state: s.nextState }, ctx([mk("b"), mk("a")]).ctx),
      n,
    );
  });
}

for (
  const [name, trigger, params, mk] of [
    [
      "new-or-updated-folder",
      newOrUpdatedFolder,
      {},
      (m: string) => rec("/users/1/projects/9", { modified_time: m }),
    ],
    [
      "new-or-updated-showcase",
      newOrUpdatedShowcase,
      {},
      (m: string) => rec("/users/1/albums/9", { modified_time: m }),
    ],
  ] as const
) {
  test(`${name}: an edited record (new modified_time) is a new event`, async () => {
    const input = { params, subscriptionId: "sub-1" };
    const s = await trigger.poll!(
      { ...input, state: {} },
      mockCtx([{ body: { data: [mk("2026-11-01T00:00:00+00:00")] } }]).ctx,
    );
    const r = await trigger.poll!(
      { ...input, state: s.nextState },
      mockCtx([{ body: { data: [mk("2026-11-09T00:00:00+00:00")] } }]).ctx,
    );
    assertEquals(r.events, [mk("2026-11-09T00:00:00+00:00")]);
  });
}
