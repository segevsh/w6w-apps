import { assertEquals, assertRejects } from "@std/assert";
import postCreate from "../../actions/post-create.ts";
import { envelope, jsonBody, mockCtx } from "../_helpers.ts";

const POST = {
  text: "Hello",
  publicationDate: "2026-11-03T10:15:30",
  timezone: "Europe/Madrid",
  providers: [{ network: "instagram" }],
};

Deno.test("post-create: POST shapes the vendor body, merging per-network data", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 11 }) }]);
  const out = await postCreate.execute({
    blogId: "9",
    ...POST,
    media: '["https://example.com/a.png"]',
    draft: false,
    networkData: { instagramData: { type: "POST" } },
  }, ctx);
  assertEquals(out, { id: 11 });
  assertEquals(calls[0].method, "POST");
  assertEquals(jsonBody(calls[0]), {
    instagramData: { type: "POST" },
    text: "Hello",
    draft: false,
    publicationDate: { dateTime: "2026-11-03T10:15:30", timezone: "Europe/Madrid" },
    providers: [{ network: "instagram" }],
    media: ["https://example.com/a.png"],
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
});

Deno.test("post-create: invalid providers JSON is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () =>
      Promise.resolve(
        postCreate.execute({ blogId: "9", ...POST, providers: "[nope" }, ctx),
      ) as Promise<unknown>,
    Error,
    "providers must be valid JSON",
  );
  assertEquals(calls.length, 0);
});
