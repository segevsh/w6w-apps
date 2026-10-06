import { assert, assertEquals } from "@std/assert";
import action from "../../actions/create-dubbing-job-for-project.ts";
import { exec, failure, mockCtx } from "../_helpers.ts";

Deno.test("create-dubbing-job-for-project: multipart with project_id and file_url", async () => {
  const reply = {
    job_id: "j",
    dubbing_type: "QA",
    file_name: "f",
    priority: "HIGH",
    target_locales: [],
  };
  const { ctx, calls } = mockCtx([{ body: reply }]);
  const out = await exec(action, {
    projectId: "p1",
    fileUrl: "https://x/v.mp4",
    priority: "HIGH",
    fileName: "f",
  }, ctx);
  const c = calls[0];
  assertEquals(c.url, "https://api.murf.ai/v1/murfdub/jobs/create-with-project-id");
  assert(c.headers["content-type"].startsWith("multipart/form-data; boundary="));
  for (
    const part of [
      'name="project_id"\r\n\r\np1',
      'name="file_url"\r\n\r\nhttps://x/v.mp4',
      'name="priority"\r\n\r\nHIGH',
      'name="file_name"\r\n\r\nf',
    ]
  ) assert(c.body!.includes(part), part);
  assert(!c.body!.includes("target_locales"));
  assertEquals(out, reply);
});

Deno.test("create-dubbing-job-for-project: requires projectId and fileUrl", async () => {
  const { ctx, calls } = mockCtx();
  assert((await failure(action, { projectId: "", fileUrl: "u" }, ctx)).includes("projectId"));
  assert((await failure(action, { projectId: "p", fileUrl: "" }, ctx)).includes("fileUrl"));
  assertEquals(calls.length, 0);
});
