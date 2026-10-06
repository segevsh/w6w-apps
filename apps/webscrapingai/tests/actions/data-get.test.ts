import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/data-get.ts";
import { mockCtx } from "../_helpers.ts";

const doc = {
  request_parameters: { url: "https://youtu.be/x", provider: "youtube", type: "video" },
  parse_status: "ok",
  data: { video_id: "x", title: "T" },
};

Deno.test("data-get: GETs /data with only the url by default", async () => {
  const { ctx, calls } = mockCtx([{ body: doc }]);
  assertEquals(await action.execute({ url: "https://youtu.be/x" }, ctx), doc);
  const u = new URL(calls[0].url);
  assertEquals(u.pathname, "/data");
  assertEquals([...u.searchParams.keys()], ["url"]);
});

Deno.test("data-get: transcript flags and country are forwarded; the language needs transcript", async () => {
  const { ctx, calls } = mockCtx([{ body: doc }, { body: doc }]);
  await action.execute({
    url: "https://youtu.be/x",
    country: "GB",
    transcript: true,
    transcriptLanguage: "de",
  }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("country"), "gb");
  assertEquals(q.get("transcript"), "true");
  assertEquals(q.get("transcript_language"), "de");
  await action.execute({ url: "https://youtu.be/x", transcriptLanguage: "de" }, ctx);
  assertEquals(new URL(calls[1].url).searchParams.has("transcript_language"), false);
});

Deno.test("data-get: a blank url makes no call; a 500 surfaces the vendor message", async () => {
  const none = mockCtx();
  await assertRejects(async () => await action.execute({ url: "" }, none.ctx), Error, "required");
  assertEquals(none.calls.length, 0);
  const { ctx } = mockCtx([{ status: 500, body: { message: "Unsupported site" } }]);
  await assertRejects(
    async () => await action.execute({ url: "https://e.test" }, ctx),
    Error,
    "Unsupported site",
  );
});
