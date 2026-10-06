import { assert, assertEquals } from "@std/assert";
import videoCreate from "../../actions/video-create.ts";
import { assertRejects, mockCtx, pathOf } from "../_helpers.ts";

const queued = (url: string) => ({
  status: 200,
  body: { id: 7, status: "queued", [url]: null, polling_url: "https://api.placid.app/x" },
});

Deno.test("video-create: clips required; fps, background and filename go in modifications", async () => {
  const clips = [{ template_uuid: "c", audio: "https://a.mp3", audio_duration: "auto" }];
  const { ctx, calls } = mockCtx([queued("video_url")]);
  await videoCreate.execute({ clips, fps: 30, canvas_background: "blur", width: 1080 }, ctx);
  assertEquals(pathOf(calls[0].url), "/videos");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.clips, clips);
  assertEquals(body.modifications, { width: 1080, fps: 30, canvas_background: "blur" });
  const plain = mockCtx([queued("video_url")]);
  await videoCreate.execute({ clips }, plain.ctx);
  assert(!("modifications" in JSON.parse(plain.calls[0].body!)));
  await assertRejects(() => videoCreate.execute({ clips: [] }, mockCtx().ctx));
});
