import { test } from "node:test";
import { assert, assertEquals, assertThrows } from "../_assert.ts";
import {
  buildAssets,
  buildMetadata,
  MUTATION_ERROR_TAIL,
  POST_STATUS_VALUES,
  SCHEDULING_TYPE_VALUES,
  SHARE_MODE_VALUES,
} from "../../lib/params.ts";

test("params: enum vocabularies match Buffer's generated CLI metadata", () => {
  // Transcribed from @bufferapp/cli@1.2.0 `built/*.mjs`, whose command details
  // are generated from the schema and carry explicit `enumValues`.
  assertEquals([...SHARE_MODE_VALUES], [
    "addToQueue",
    "shareNow",
    "shareNext",
    "customScheduled",
  ]);
  assertEquals([...SCHEDULING_TYPE_VALUES], ["automatic", "notification"]);
  assertEquals([...POST_STATUS_VALUES], [
    "draft",
    "needs_approval",
    "scheduled",
    "sending",
    "sent",
    "error",
  ]);
});

test("params: needs_approval keeps its underscore — the one non-camelCase member", () => {
  assert(POST_STATUS_VALUES.includes("needs_approval"));
  assert(!(POST_STATUS_VALUES as readonly string[]).includes("needsApproval"));
});

test("params: every mutation tail carries __typename and a MutationError catch-all", () => {
  assert(MUTATION_ERROR_TAIL.includes("__typename"));
  assert(MUTATION_ERROR_TAIL.includes("... on MutationError { message }"));
  // RestProxyError is broken out because a network-side rejection needs a
  // different fix from a Buffer-side one.
  assert(MUTATION_ERROR_TAIL.includes("RestProxyError"));
});

test("buildAssets: one image asset per comma-separated URL, order preserved", () => {
  assertEquals(buildAssets({ imageUrls: "https://x/1.png, https://x/2.png" }), [
    { image: { url: "https://x/1.png" } },
    { image: { url: "https://x/2.png" } },
  ]);
});

test("buildAssets: images, then video, then link — the order they are listed in", () => {
  assertEquals(
    buildAssets({
      imageUrls: "https://x/1.png",
      videoUrl: "https://x/v.mp4",
      linkUrl: "https://x",
    }),
    [
      { image: { url: "https://x/1.png" } },
      { video: { url: "https://x/v.mp4" } },
      { link: { url: "https://x" } },
    ],
  );
});

test("buildAssets: link title and description ride along only when set", () => {
  assertEquals(buildAssets({ linkUrl: "https://x", linkTitle: "T" }), [
    { link: { url: "https://x", title: "T" } },
  ]);
});

test("buildAssets: nothing supplied is undefined, which editPost reads as 'preserve'", () => {
  assertEquals(buildAssets({}), undefined);
  assertEquals(buildAssets({ imageUrls: "  " }), undefined);
});

test("buildAssets: an explicit empty array survives — editPost reads that as 'clear'", () => {
  assertEquals(buildAssets({ assets: [] }), []);
  assertEquals(buildAssets({ assets: "[]" }), []);
});

test("buildAssets: the raw array overrides the flat fields", () => {
  assertEquals(
    buildAssets({
      imageUrls: "https://x/ignored.png",
      assets: [{ document: { url: "https://x/d.pdf", title: "D" } }],
    }),
    [{ document: { url: "https://x/d.pdf", title: "D" } }],
  );
});

test("buildAssets: a non-array raw value is rejected loudly", () => {
  assertThrows(() => buildAssets({ assets: '{"image":{}}' }), Error, "JSON array");
  assertThrows(() => buildAssets({ assets: "not json" }), Error, "not valid JSON");
});

test("buildMetadata: passes a network-keyed object straight through", () => {
  assertEquals(buildMetadata({ linkedin: { firstComment: "hi" } }), {
    linkedin: { firstComment: "hi" },
  });
  assertEquals(buildMetadata('{"twitter":{"thread":[{"text":"a"}]}}'), {
    twitter: { thread: [{ text: "a" }] },
  });
  assertEquals(buildMetadata(""), undefined);
});
