import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-video.ts";

Deno.test("update-video: PUTs to /youtube/v3/videos with the snippet part", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "v1" } }]);
  await action.execute!({
    id: "v1",
    part: "snippet",
    title: "New title",
    categoryId: "22",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "PUT");
  assertEquals(url.pathname, "/youtube/v3/videos");
  assertEquals(url.searchParams.get("part"), "snippet");
  assertEquals(JSON.parse(calls[0].body!), {
    id: "v1",
    snippet: { title: "New title", categoryId: "22" },
  });
});

Deno.test("update-video: requires title and categoryId whenever snippet is written", async () => {
  const { ctx, calls } = mockCtx([]);
  // Google marks snippet.title and snippet.categoryId required on this method;
  // omitting either is the classic opaque 400.
  await assertRejects(
    async () => {
      await action.execute!({ id: "v1", part: "snippet", title: "t" }, ctx);
    },
    Error,
    "`title` and `categoryId` are both required",
  );
  await assertRejects(
    async () => {
      await action.execute!({ id: "v1", part: "snippet", categoryId: "22" }, ctx);
    },
    Error,
    "`title` and `categoryId` are both required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("update-video: refuses an empty status part rather than clearing the video's status", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => {
      await action.execute!({ id: "v1", part: "status" }, ctx);
    },
    Error,
    "no status field was supplied",
  );
  assertEquals(calls.length, 0);
});

Deno.test("update-video: writes both parts when both are named and filled", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({
    id: "v1",
    part: ["snippet", "status"],
    title: "T",
    categoryId: "22",
    description: "D",
    tags: ["a", "b"],
    defaultLanguage: "en",
    privacyStatus: "private",
    embeddable: false,
    license: "creativeCommon",
    publicStatsViewable: true,
    publishAt: "2026-09-01T00:00:00Z",
    selfDeclaredMadeForKids: false,
  }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("part"), "snippet,status");
  assertEquals(JSON.parse(calls[0].body!), {
    id: "v1",
    snippet: {
      title: "T",
      categoryId: "22",
      description: "D",
      tags: ["a", "b"],
      defaultLanguage: "en",
    },
    status: {
      privacyStatus: "private",
      embeddable: false,
      license: "creativeCommon",
      publicStatsViewable: true,
      publishAt: "2026-09-01T00:00:00Z",
      selfDeclaredMadeForKids: false,
    },
  });
});

Deno.test("update-video: never sends a part the caller did not name", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  // Status fields supplied but `status` not in `part` — the body must not carry
  // a status object, because the API would ignore it and the caller would think
  // it applied.
  await action.execute!({
    id: "v1",
    part: "snippet",
    title: "T",
    categoryId: "22",
    privacyStatus: "private",
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.status, undefined);
  assertEquals(new URL(calls[0].url).searchParams.get("part"), "snippet");
});

Deno.test("update-video: splits comma-typed tags into an array", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({
    id: "v1",
    part: "snippet",
    title: "T",
    categoryId: "22",
    tags: "one, two ,three",
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).snippet.tags, ["one", "two", "three"]);
});

Deno.test("update-video: is a retry-safe perform and offers only writable parts", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
  const part = action.params!.find((p) => p.key === "part");
  assertEquals((part!.options as Array<{ value: string }>).map((o) => o.value), [
    "snippet",
    "status",
  ]);
});
