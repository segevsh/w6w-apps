import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/asset-list.ts";

const M = { display: { credentialKind: "management", region: "eu", spaceId: "123" } };
const assets = {
  status: 200,
  body: {
    assets: [
      {
        id: 1,
        filename: "https://a.storyblok.com/f/1/hero.jpg",
        content_type: "image/jpeg",
        content_length: 200000,
        alt: "A hero",
      },
      {
        id: 2,
        filename: "https://a.storyblok.com/f/1/secret.pdf",
        content_type: "application/pdf",
        content_length: 50000,
        is_private: true,
      },
      {
        id: 3,
        filename: "https://a.storyblok.com/f/1/naked.png",
        content_type: "image/png",
        content_length: 1000,
        alt: "  ",
      },
    ],
  },
  headers: { total: "3" },
};

Deno.test("asset-list: returns the URLs and totals the storage", async () => {
  const { ctx, calls } = mockCtx([assets], M);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).pathname, "/v1/spaces/123/assets");
  assertEquals(result.count, 3);
  assertEquals(result.totalBytes, 251000);
});

/** A public token gives a broken image for exactly these. */
Deno.test("asset-list: counts the private assets", async () => {
  const { ctx } = mockCtx([assets], M);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.privateCount, 1);
});

/** Whitespace is not alt text. */
Deno.test("asset-list: names images with no alt text, and ignores non-images", async () => {
  const { ctx } = mockCtx([assets], M);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.withoutAltText, ["https://a.storyblok.com/f/1/naked.png"]);
});

Deno.test("asset-list: search and folder reach the query", async () => {
  const { ctx, calls } = mockCtx([assets], M);
  await action.execute({ search: "hero", folderId: "7" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("search"), "hero");
  assertEquals(q.get("in_folder"), "7");
});

/** The Image Service resizes by URL suffix. */
Deno.test("asset-list: says an asset URL outlives the record", () => {
  assert(/outlives the record/.test(action.description!), action.description);
  assert(/URL SUFFIX/.test(action.description!), action.description);
});
