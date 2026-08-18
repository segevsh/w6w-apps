import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/asset-upload.ts";

const conn = { display: { cloudName: "acme", region: "us" } };

Deno.test("asset-upload: form-encodes the upload against the Upload API route", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { public_id: "hero" } }], conn);
  await action.execute!({
    file: "https://example.com/a.jpg",
    publicId: "products/hero",
    folder: "products",
    tags: "product, hero",
  }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1_1/acme/image/upload");
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  const sent = new URLSearchParams(calls[0].body!);
  assertEquals(sent.get("file"), "https://example.com/a.jpg");
  assertEquals(sent.get("public_id"), "products/hero");
  assertEquals(sent.get("tags"), "product,hero");
});

/** Context is a pipe-joined key=value string, never JSON. */
Deno.test("asset-upload: context goes out in Cloudinary's pipe form", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], conn);
  await action.execute!({ file: "https://x.test/a.jpg", context: '{"alt":"Hero"}' }, ctx);
  assertEquals(new URLSearchParams(calls[0].body!).get("context"), "alt=Hero");
});

/** Overwriting without invalidating keeps the old bytes on the CDN. */
Deno.test("asset-upload: overwriting without invalidate logs a warning", async () => {
  const { ctx, logs } = mockCtx([{ status: 200, body: {} }], conn);
  await action.execute!({ file: "https://x.test/a.jpg", publicId: "hero", overwrite: true }, ctx);
  assert(
    logs.some((l) => l.level === "warn" && /CDN/.test(l.message)),
    JSON.stringify(logs),
  );
});

Deno.test("asset-upload: invalidating alongside overwrite does not warn", async () => {
  const { ctx, logs } = mockCtx([{ status: 200, body: {} }], conn);
  await action.execute!(
    { file: "https://x.test/a.jpg", publicId: "hero", overwrite: true, invalidate: true },
    ctx,
  );
  assertEquals(logs.filter((l) => l.level === "warn").length, 0);
});

Deno.test("asset-upload: no file is refused before the wire", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "file");
  assertEquals(calls.length, 0);
});

/** Without a public id every run creates another copy. */
Deno.test("asset-upload: declares itself non-idempotent and says why", () => {
  assertEquals(action.idempotent, false);
  const p = (action.params as Array<{ key: string; hint?: string }>)
    .find((p) => p.key === "publicId")!;
  assert(/ANOTHER\s+copy|duplicate/i.test(p.hint!), p.hint);
});
