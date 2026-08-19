import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/bucket-list.ts";

const page = {
  status: 200,
  body: {
    items: [
      { name: "uploads", iamConfiguration: { uniformBucketLevelAccess: { enabled: true } } },
      { name: "legacy", iamConfiguration: { uniformBucketLevelAccess: { enabled: false } } },
    ],
    nextPageToken: "tok",
  },
};

Deno.test("bucket-list: lists a project's buckets", async () => {
  const { ctx, calls } = mockCtx([page]);
  const result = await action.execute({ project: "p1" }, ctx) as Record<string, unknown>;
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/storage/v1/b");
  assertEquals(url.searchParams.get("project"), "p1");
  assertEquals(result.names, ["uploads", "legacy"]);
  assertEquals(result.nextPageToken, "tok");
});

/** Measured: the project is validated before the credential. */
Deno.test("bucket-list: a project is required, and the hint says why", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await action.execute({}, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/`project` is required/.test(message), message);
  assertEquals(calls.length, 0);
  const project = action.params!.find((p) => p.key === "project")!;
  assert(/validates the project BEFORE the credential/.test(project.hint!), project.hint);
});

/** A service account with no role lists successfully and sees nothing. */
Deno.test("bucket-list: an empty result is reported as probably a missing role", async () => {
  const { ctx, logs } = mockCtx([{ status: 200, body: { items: [] } }]);
  const result = await action.execute({ project: "p1" }, ctx) as Record<string, unknown>;
  assertEquals(result.count, 0);
  assertEquals(result.visible, false);
  assertEquals(logs[0].level, "warn");
  assert(/no IAM role lists successfully and sees nothing/.test(logs[0].message), logs[0].message);
});

Deno.test("bucket-list: an empty page of a filtered or paged listing does not warn", async () => {
  const filtered = mockCtx([{ status: 200, body: { items: [] } }]);
  await action.execute({ project: "p1", prefix: "temp-" }, filtered.ctx);
  assertEquals(filtered.logs.length, 0);

  const paged = mockCtx([{ status: 200, body: { items: [] } }]);
  await action.execute({ project: "p1", pageToken: "tok" }, paged.ctx);
  assertEquals(paged.logs.length, 0);
});

/** With uniform access on, per-object ACLs do not exist at all. */
Deno.test("bucket-list: counts the buckets where per-object ACLs are disabled", async () => {
  const { ctx } = mockCtx([page]);
  const result = await action.execute({ project: "p1" }, ctx) as Record<string, unknown>;
  assertEquals(result.uniformAccessCount, 1);
});

Deno.test("bucket-list: the page size is clamped", async () => {
  const { ctx, calls } = mockCtx([page]);
  await action.execute({ project: "p1", maxResults: 9999 }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("maxResults"), "1000");
});
