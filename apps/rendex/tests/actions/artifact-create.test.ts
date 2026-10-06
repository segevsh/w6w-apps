import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/artifact-create.ts";
import { bodyOf, envelope, mockCtx, obj, pathOf } from "../_helpers.ts";

Deno.test("artifact-create: POSTs /artifact with parsed branding and page setup", async () => {
  const data = {
    pdfUrl: "https://api.rendex.dev/v1/images/a.pdf",
    expiresAt: "2026-10-07T00:00:00Z",
  };
  const { ctx, calls } = mockCtx([{ body: envelope(data) }]);
  const out = await obj(
    await action.execute({
      content: "# Report",
      formats: ["pdf"],
      branding: '{"header":"Acme","accentColor":"#EA580C"}',
      pageSetup: { size: "A4" },
      expiresIn: 7200,
    }, ctx),
  );
  assertEquals(pathOf(calls[0].url), "/v1/artifact");
  assertEquals(bodyOf(calls[0]), {
    content: "# Report",
    formats: ["pdf"],
    branding: { header: "Acme", accentColor: "#EA580C" },
    pageSetup: { size: "A4" },
    expiresIn: 7200,
  });
  assertEquals(out.pdfUrl, data.pdfUrl);
});

Deno.test("artifact-create: content is required", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await action.execute({ content: " " }, ctx),
    Error,
    "Content is required",
  );
  assertEquals(calls.length, 0);
});
