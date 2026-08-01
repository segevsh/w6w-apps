import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-job-info.ts";

const display = { endpoint: "https://ci.example.com" };

Deno.test("get-job-info: GETs /job/<name>/api/json", async () => {
  const { ctx, calls } = mockCtx([
    { body: { name: "my-job", url: "x", buildable: true, color: "blue", nextBuildNumber: 5 } },
  ], { display });
  const result = await action.execute({ job: "my-job" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/job/my-job/api/json");
  assertEquals(result, {
    name: "my-job",
    url: "x",
    buildable: true,
    color: "blue",
    nextBuildNumber: 5,
  });
});

Deno.test("get-job-info: expands a folder-nested job path", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display });
  await action.execute({ job: "my-folder/my-pipeline" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/job/my-folder/job/my-pipeline/api/json");
});
