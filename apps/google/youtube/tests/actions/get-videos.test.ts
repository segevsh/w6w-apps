import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-videos.ts";

Deno.test("get-videos: hits /youtube/v3/videos with part and a comma-joined id list", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  await action.execute!({ part: ["snippet", "statistics"], id: ["v1", "v2"] }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/youtube/v3/videos");
  assertEquals(url.searchParams.get("part"), "snippet,statistics");
  assertEquals(url.searchParams.getAll("id"), ["v1,v2"]);
});

Deno.test("get-videos: accepts the chart filter", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ part: "snippet", chart: "mostPopular", regionCode: "GB" }, ctx);
  const p = new URL(calls[0].url).searchParams;
  assertEquals(p.get("chart"), "mostPopular");
  assertEquals(p.get("regionCode"), "GB");
  assertEquals(p.get("id"), null);
});

Deno.test("get-videos: accepts the myRating filter", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ part: "id", myRating: "like" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("myRating"), "like");
});

Deno.test("get-videos: rejects zero filters before spending a request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => {
      await action.execute!({ part: "snippet" }, ctx);
    },
    Error,
    "exactly one of `id`, `chart` or `myRating`",
  );
  assertEquals(calls.length, 0);
});

Deno.test("get-videos: rejects two filters at once", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => {
      await action.execute!({ part: "snippet", id: "v1", chart: "mostPopular" }, ctx);
    },
    Error,
    "exactly one of",
  );
  assertEquals(calls.length, 0);
});

Deno.test("get-videos: forwards the remaining documented parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({
    part: "player",
    chart: "mostPopular",
    maxResults: 50,
    pageToken: "tok",
    videoCategoryId: "10",
    hl: "de",
    maxWidth: 640,
    maxHeight: 480,
  }, ctx);
  const p = new URL(calls[0].url).searchParams;
  assertEquals(p.get("maxResults"), "50");
  assertEquals(p.get("pageToken"), "tok");
  assertEquals(p.get("videoCategoryId"), "10");
  assertEquals(p.get("hl"), "de");
  assertEquals(p.get("maxWidth"), "640");
  assertEquals(p.get("maxHeight"), "480");
});

Deno.test("get-videos: defaults part to the three sections most callers need", () => {
  const part = action.params!.find((p) => p.key === "part");
  assertEquals(part?.default, "snippet,contentDetails,statistics");
  assertEquals(part?.required, true);
});
