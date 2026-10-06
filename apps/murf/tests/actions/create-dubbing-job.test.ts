import { assert, assertEquals } from "@std/assert";
import action from "../../actions/create-dubbing-job.ts";
import { exec, failure, mockCtx } from "../_helpers.ts";

const reply = {
  job_id: "job1",
  dubbing_type: "AUTOMATED",
  file_name: "f",
  priority: "LOW",
  target_locales: ["fr_FR"],
};

Deno.test("create-dubbing-job: multipart with file_url and one target_locales part per locale", async () => {
  const { ctx, calls } = mockCtx([{ body: reply }]);
  const out = await exec(action, {
    fileUrl: "https://x/v.mp4",
    targetLocales: "fr_FR, de_DE",
    sourceLocale: "en_US",
    priority: "LOW",
    webhookSecret: "s3",
  }, ctx);
  const c = calls[0];
  assertEquals(c.url, "https://api.murf.ai/v1/murfdub/jobs/create");
  assertEquals(c.method, "POST");
  assert(c.headers["content-type"].startsWith("multipart/form-data; boundary="));
  assertEquals(c.body!.split('name="target_locales"').length - 1, 2);
  for (
    const part of [
      'name="file_url"\r\n\r\nhttps://x/v.mp4',
      'name="target_locales"\r\n\r\nfr_FR',
      'name="target_locales"\r\n\r\nde_DE',
      'name="source_locale"\r\n\r\nen_US',
      'name="priority"\r\n\r\nLOW',
      'name="webhook_secret"\r\n\r\ns3',
    ]
  ) assert(c.body!.includes(part), part);
  assert(!c.body!.includes('name="webhook_url"'));
  assertEquals(out, reply);
});

Deno.test("create-dubbing-job: validates before calling", async () => {
  const { ctx, calls } = mockCtx();
  assert((await failure(action, { fileUrl: "", targetLocales: "fr_FR" }, ctx)).includes("fileUrl"));
  assert(
    (await failure(action, { fileUrl: "u", targetLocales: " " }, ctx)).includes("targetLocales"),
  );
  assertEquals(calls.length, 0);
});

Deno.test("create-dubbing-job: a 400 fails with the vendor message", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { error_message: "bad locale", error_code: 400 },
  }]);
  assert(
    (await failure(action, { fileUrl: "u", targetLocales: "xx" }, ctx)).includes("bad locale"),
  );
});
