import { assert, assertEquals, assertRejects } from "@std/assert";
import evidenceCreate from "../../actions/evidence-create.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("evidence-create: builds a single URL artifact from the flat fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 12, artifactsCreated: 1 } }]);
  const out = await evidenceCreate.execute({
    workspaceId: 7,
    name: "Pen test",
    artifactName: "Report",
    url: "https://example.com/pentest",
    filedAt: "2026-09-01",
    controlIds: "3, 4",
    url_extra: "ignored",
  } as never, ctx) as { id: number };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/public/v2/workspaces/7/evidence");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Pen test",
    controlIds: [3, 4],
    artifacts: [{
      type: "URL",
      artifactName: "Report",
      url: "https://example.com/pentest",
      filedAt: "2026-09-01",
    }],
  });
  assertEquals(out.id, 12);
});

Deno.test("evidence-create: an S3_FILE artifact carries the fileKey and not the url", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 1 } }]);
  await evidenceCreate.execute({
    workspaceId: 7,
    name: "SOC 2 report",
    artifactType: "S3_FILE",
    fileKey: "acct/evidence-library/uuid/report.pdf",
    url: "https://ignored.example",
    filedAt: "2026-09-01",
  }, ctx);
  const [artifact] = JSON.parse(calls[0].body!).artifacts;
  assertEquals(artifact.type, "S3_FILE");
  assertEquals(artifact.fileKey, "acct/evidence-library/uuid/report.pdf");
  assertEquals("url" in artifact, false);
});

Deno.test("evidence-create: an `artifacts` JSON array replaces the flat fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 1 } }]);
  const artifacts = [
    { type: "URL", url: "https://a.example", filedAt: "2026-01-01" },
    { type: "URL", url: "https://b.example", filedAt: "2026-01-02" },
  ];
  await evidenceCreate.execute({
    workspaceId: 7,
    name: "Two",
    artifacts: JSON.stringify(artifacts),
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).artifacts, artifacts);
});

Deno.test("evidence-create: missing required artifact pieces fail before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  for (
    const input of [
      { workspaceId: 7, name: "n", url: "https://x.example" }, // no filedAt
      { workspaceId: 7, name: "n", filedAt: "2026-01-01" }, // URL without url
      { workspaceId: 7, name: "n", artifactType: "S3_FILE", filedAt: "2026-01-01" },
      { workspaceId: 7, name: "n", artifactType: "TICKET_PROVIDER", filedAt: "2026-01-01" },
    ]
  ) {
    await assertRejects(
      () => Promise.resolve().then(() => evidenceCreate.execute(input, ctx)),
      Error,
    );
  }
  assertEquals(calls.length, 0);
});

Deno.test("evidence-create: is non-idempotent and a 403 names the permission", async () => {
  assertEquals(evidenceCreate.idempotent, false);
  const { ctx } = mockCtx([{ status: 403, body: errorBody(403, "Forbidden", 5) }]);
  const err = await assertRejects(
    () =>
      Promise.resolve().then(() =>
        evidenceCreate.execute({
          workspaceId: 7,
          name: "n",
          url: "https://x.example",
          filedAt: "2026-01-01",
        }, ctx)
      ),
    Error,
  );
  assert(err.message.includes("permission"), err.message);
});
