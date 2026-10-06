import { assertEquals, assertRejects } from "@std/assert";
import transcriptGet from "../../actions/transcript-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("transcript-get: GETs /transcript with only the set params and flags a finished transcript", async () => {
  const body = {
    content: [{ text: "hi", offset: 0, duration: 900 }],
    lang: "en",
    availableLangs: ["en"],
  };
  const { ctx, calls } = mockCtx([{ body }]);
  const out = await transcriptGet.execute(
    { url: "https://youtu.be/x", lang: "en", text: false, mode: "native", chunkSize: 200 },
    ctx,
  );
  assertEquals(out, { pending: false, ...body });
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://api.supadata.ai/v1/transcript");
  assertEquals(Object.fromEntries(url.searchParams), {
    url: "https://youtu.be/x",
    lang: "en",
    mode: "native",
    chunkSize: "200",
  });
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].headers["x-api-key"], undefined);
});

Deno.test("transcript-get: text=true is sent and a job id answer is pending", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: { jobId: "job-1" } }]);
  const out = await transcriptGet.execute({ url: "https://x.test/v.mp4", text: true }, ctx);
  assertEquals(out, { pending: true, jobId: "job-1" });
  assertEquals(new URL(calls[0].url).searchParams.get("text"), "true");
});

Deno.test("transcript-get: a 206 transcript-unavailable envelope is thrown, not returned", async () => {
  const { ctx } = mockCtx([{
    status: 206,
    body: {
      error: "transcript-unavailable",
      message: "Transcript Unavailable",
      details: "No transcript",
    },
  }]);
  await assertRejects(
    async () => await transcriptGet.execute({ url: "https://youtu.be/x" }, ctx),
    Error,
    "transcript-unavailable",
  );
});

Deno.test("transcript-get: url is required and no request is made without it", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await transcriptGet.execute({ url: " " }, ctx),
    Error,
    "required",
  );
  assertEquals(calls.length, 0);
});
