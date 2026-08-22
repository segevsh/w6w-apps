import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/blob-upload.ts";

const blob = ok({
  blob: { $type: "blob", ref: { $link: "bafy" }, mimeType: "image/png", size: 3 },
});
const PNG = "iVBORw0KGgo=";

Deno.test("blob-upload: posts raw bytes with the declared content type", async () => {
  const { ctx, calls } = mockCtx([blob], { display });
  const result = await action.execute!({ data: PNG, mimeType: "image/png" }, ctx) as {
    size: number;
  };
  assertEquals(calls[0].url, "https://bsky.social/xrpc/com.atproto.repo.uploadBlob");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "image/png");
  assertEquals(result.size, 8);
});

/** Pasting a whole data URL is common, and it carries its own type. */
Deno.test("blob-upload: a data: URL supplies its own mime type", async () => {
  const { ctx, calls } = mockCtx([blob], { display });
  const result = await action.execute!({
    data: `data:image/webp;base64,${PNG}`,
    mimeType: "image/jpeg",
  }, ctx) as { mimeType: string };
  assertEquals(calls[0].headers["content-type"], "image/webp");
  assertEquals(result.mimeType, "image/webp");
});

/** Alt text belongs on the embed, which is where it gets forgotten. */
Deno.test("blob-upload: returns a ready-made embed with the alt text in it", async () => {
  const { ctx } = mockCtx([blob], { display });
  const result = await action.execute!({ data: PNG, alt: "a red square" }, ctx) as {
    embed: { $type: string; images: Array<{ alt: string; image: unknown }> };
  };
  assertEquals(result.embed.$type, "app.bsky.embed.images");
  assertEquals(result.embed.images[0].alt, "a red square");
  assert(result.embed.images[0].image, "the blob reference is not in the embed");
});

Deno.test("blob-upload: an over-size file is refused before the upload, with the number", async () => {
  const big = btoa("x".repeat(1_000_001));
  const { ctx, calls } = mockCtx([], { display });
  const error = await assertRejects(
    async () => await action.execute!({ data: big }, ctx),
    Error,
  );
  assert(/1000000/.test(error.message), error.message);
  assert(/encoded bytes, not the dimensions/.test(error.message), error.message);
  assertEquals(calls.length, 0);
});

Deno.test("blob-upload: invalid or empty base64 is refused", async () => {
  const bad = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ data: "!!!not base64!!!" }, bad.ctx),
    Error,
    "not valid base64",
  );

  const empty = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ data: "data:image/png;base64," }, empty.ctx),
    Error,
    "zero bytes",
  );
});

Deno.test("blob-upload: needs data", async () => {
  const { ctx } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`data` is required");
});

Deno.test("blob-upload: a PDS that returns no reference fails loudly", async () => {
  const { ctx } = mockCtx([ok({})], { display });
  await assertRejects(
    async () => await action.execute!({ data: PNG }, ctx),
    Error,
    "did not return a blob reference",
  );
});

/** An unreferenced blob is garbage — uploading alone shows nothing to anyone. */
Deno.test("blob-upload: says nothing is visible until a post embeds it", () => {
  assert(/EMBEDS the reference/.test(action.description!), action.description);
  assertEquals(action.idempotent, false);
});

Deno.test("blob-upload: logs size and type, never the bytes", async () => {
  const { ctx, logs } = mockCtx([blob], { display });
  await action.execute!({ data: PNG }, ctx);
  assertEquals(logs[0].data, { size: 8, mimeType: "image/jpeg" });
});
