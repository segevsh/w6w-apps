import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  resolveLocation,
  resolveProject,
  resolvePublisherModel,
  resolveResource,
  VertexClient,
} from "../../lib/client.ts";

const conn = (display: Record<string, unknown>) => mockCtx([], { display }).ctx.connection;

Deno.test("resolveProject: override wins, then the connection, else an error", () => {
  assertEquals(resolveProject(conn({ projectId: "c" }), "o"), "o");
  assertEquals(resolveProject(conn({ projectId: "c" })), "c");
  try {
    resolveProject(undefined);
    assert(false);
  } catch (e) {
    assert(String(e).includes("no Google Cloud project"));
  }
  try {
    resolveProject(undefined, "../x");
    assert(false);
  } catch (e) {
    assert(String(e).includes("not a valid"));
  }
});

Deno.test("resolveLocation: defaults to us-central1 and refuses unknown values", () => {
  assertEquals(resolveLocation(undefined), "us-central1");
  assertEquals(resolveLocation(conn({ location: "europe-west4" })), "europe-west4");
  assertEquals(resolveLocation(conn({ location: "europe-west4" }), "global"), "global");
  try {
    resolveLocation(undefined, "evil.com");
    assert(false);
  } catch (e) {
    assert(String(e).includes("unknown Vertex AI location"));
  }
});

Deno.test("resolveResource: a full name's own location wins over the connection's", () => {
  const t = resolveResource(
    conn({ projectId: "p1", location: "us-central1" }),
    { endpointId: "projects/p2/locations/europe-west4/endpoints/77" },
    "endpoints",
    "endpointId",
  );
  assertEquals(t, {
    location: "europe-west4",
    name: "projects/p2/locations/europe-west4/endpoints/77",
  });
});

Deno.test("resolveResource: a bare id uses the connection; a wrong collection or bad id throws", () => {
  const c = conn({ projectId: "p1", location: "asia-southeast1" });
  assertEquals(
    resolveResource(c, { jobId: "123" }, "batchPredictionJobs", "jobId").name,
    "projects/p1/locations/asia-southeast1/batchPredictionJobs/123",
  );
  for (
    const bad of [{ jobId: "../x" }, { jobId: "" }, {
      jobId: "projects/p1/locations/us-central1/models/1",
    }]
  ) {
    try {
      resolveResource(c, bad, "batchPredictionJobs", "jobId");
      assert(false, JSON.stringify(bad));
    } catch (e) {
      assert(!String(e).startsWith("AssertionError"), String(e));
    }
  }
});

Deno.test("resolvePublisherModel: bare id, publishers/ form, and full name", () => {
  const c = conn({ projectId: "p1", location: "us-central1" });
  const base = "projects/p1/locations/us-central1/publishers";
  assertEquals(
    resolvePublisherModel(c, { model: "gemini-2.5-flash" }).name,
    `${base}/google/models/gemini-2.5-flash`,
  );
  assertEquals(
    resolvePublisherModel(c, { model: "publishers/meta/models/llama" }).name,
    `${base}/meta/models/llama`,
  );
  assertEquals(
    resolvePublisherModel(c, {
      model: "projects/p9/locations/europe-west1/publishers/google/models/m",
    }),
    {
      location: "europe-west1",
      name: "projects/p9/locations/europe-west1/publishers/google/models/m",
    },
  );
});

Deno.test("VertexClient: routes to the location's host, surfaces error.status and message", async () => {
  const { ctx, calls } = mockCtx([
    { status: 403, body: { error: { code: 403, status: "PERMISSION_DENIED", message: "nope" } } },
  ]);
  await assertRejects(
    () => new VertexClient(ctx).request("europe-west4", "projects/p/locations/europe-west4/x"),
    Error,
    "403 PERMISSION_DENIED",
  );
  assertEquals(
    calls[0].url,
    "https://europe-west4-aiplatform.googleapis.com/v1/projects/p/locations/europe-west4/x",
  );
});

Deno.test("VertexClient: requestAll follows nextPageToken and honours the limit", async () => {
  const { ctx, calls } = mockCtx([
    { body: { endpoints: [{ n: 1 }, { n: 2 }], nextPageToken: "t2" } },
    { body: { endpoints: [{ n: 3 }] } },
  ]);
  const all = await new VertexClient(ctx).requestAll(
    "global",
    "projects/p/locations/global/endpoints",
    "endpoints",
  );
  assertEquals(all.items.length, 3);
  assert(calls[1].url.includes("pageToken=t2"));
  assert(calls[0].url.startsWith("https://aiplatform.googleapis.com/v1/"));

  const { ctx: c2, calls: k2 } = mockCtx([{
    body: { endpoints: [{ n: 1 }, { n: 2 }], nextPageToken: "x" },
  }]);
  const some = await new VertexClient(c2).requestAll("global", "p", "endpoints", {}, 2);
  assertEquals(some.items.length, 2);
  assertEquals(some.nextPageToken, "x");
  assertEquals(k2.length, 1);
  assert(k2[0].url.includes("pageSize=2"));
});
