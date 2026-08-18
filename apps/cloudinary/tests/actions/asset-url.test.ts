import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/asset-url.ts";

const conn = { display: { cloudName: "acme", region: "us" } };

/** This action makes no API call at all. */
Deno.test("asset-url: builds the URL locally, with no request", async () => {
  const { ctx, calls } = mockCtx([], conn);
  const out = await action.execute!({
    publicId: "products/hero",
    transformation: "w_800,c_fill,q_auto,f_auto",
  }, ctx) as { url: string };
  assertEquals(
    out.url,
    "https://res.cloudinary.com/acme/image/upload/w_800,c_fill,q_auto,f_auto/products/hero",
  );
  assertEquals(calls.length, 0);
});

/** The version segment is what makes a URL immutable. */
Deno.test("asset-url: the version segment is normalised to v<number>", async () => {
  const { ctx } = mockCtx([], conn);
  const a = await action.execute!({ publicId: "hero", version: "1712345678" }, ctx) as {
    url: string;
  };
  const b = await action.execute!({ publicId: "hero", version: "v1712345678" }, ctx) as {
    url: string;
  };
  assertEquals(a.url, "https://res.cloudinary.com/acme/image/upload/v1712345678/hero");
  assertEquals(a.url, b.url);
});

Deno.test("asset-url: a format extension is appended, dot or no dot", async () => {
  const { ctx } = mockCtx([], conn);
  const out = await action.execute!({ publicId: "hero", format: ".webp" }, ctx) as { url: string };
  assertEquals(out.url, "https://res.cloudinary.com/acme/image/upload/hero.webp");
});

/** A signed URL needs the API secret, which only the auth hook may touch. */
Deno.test("asset-url: refuses private and authenticated assets", async () => {
  const { ctx } = mockCtx([], conn);
  for (const type of ["private", "authenticated"]) {
    await assertRejects(
      async () => await action.execute!({ publicId: "hero", type }, ctx),
      Error,
      "SIGNED",
    );
  }
});

Deno.test("asset-url: a connection with no cloud name cannot build a URL", async () => {
  const { ctx } = mockCtx([], { display: {} });
  await assertRejects(
    async () => await action.execute!({ publicId: "hero" }, ctx),
    Error,
    "cloud name",
  );
});

Deno.test("asset-url: only publicly deliverable types are offered", () => {
  const p = (action.params as Array<{ key: string; options?: Array<{ value: string }> }>)
    .find((p) => p.key === "type")!;
  const values = p.options!.map((o) => o.value);
  assertEquals(values, ["upload", "fetch"]);
  assert(!values.includes("private"));
});
