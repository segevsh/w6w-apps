import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/stop-build.ts";

const display = { endpoint: "https://ci.example.com" };

// Real Jenkins answers `/stop` with a 302 to the build page; `fetch` follows redirects
// by default, so the client sees the post-redirect 200 — that's what the mock simulates.
Deno.test("stop-build: POSTs /job/<name>/<buildNumber>/stop", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }], { display });
  const result = await action.execute({ job: "my-job", buildNumber: 12 }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/job/my-job/12/stop");
  assertEquals(result, { stopped: true });
});

Deno.test("stop-build: defaults buildNumber to lastBuild when omitted", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }], { display });
  await action.execute({ job: "my-job" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/job/my-job/lastBuild/stop");
});

Deno.test("stop-build: expands a folder-nested job path", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }], { display });
  await action.execute({ job: "my-folder/my-pipeline", buildNumber: "lastBuild" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/job/my-folder/job/my-pipeline/lastBuild/stop");
});
