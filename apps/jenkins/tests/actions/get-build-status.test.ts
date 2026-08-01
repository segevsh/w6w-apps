import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-build-status.ts";

const display = { endpoint: "https://ci.example.com" };

Deno.test("get-build-status: GETs /job/<name>/<buildNumber>/api/json", async () => {
  const { ctx, calls } = mockCtx([
    { body: { number: 12, result: "SUCCESS", building: false, url: "x", duration: 4200 } },
  ], { display });
  const result = await action.execute({ job: "my-job", buildNumber: 12 }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/job/my-job/12/api/json");
  assertEquals(result, {
    number: 12,
    result: "SUCCESS",
    building: false,
    url: "x",
    duration: 4200,
  });
});

Deno.test("get-build-status: defaults buildNumber to lastBuild when omitted", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display });
  await action.execute({ job: "my-job" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/job/my-job/lastBuild/api/json");
});

Deno.test("get-build-status: accepts a permalink such as lastSuccessfulBuild", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display });
  await action.execute({ job: "my-job", buildNumber: "lastSuccessfulBuild" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/job/my-job/lastSuccessfulBuild/api/json");
});

Deno.test("get-build-status: expands a folder-nested job path", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display });
  await action.execute({ job: "my-folder/my-pipeline", buildNumber: 3 }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/job/my-folder/job/my-pipeline/3/api/json");
});
