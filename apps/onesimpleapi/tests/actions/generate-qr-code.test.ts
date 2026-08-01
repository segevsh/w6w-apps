import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/generate-qr-code.ts";

Deno.test("generate-qr-code: GETs /qr_code with the message query param", async () => {
  const body = { url: "https://cdn.opq.to/x.png" };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ message: "https://example.com" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/qr_code");
  assertEquals(url.searchParams.get("message"), "https://example.com");
  assertEquals(result, body);
});

Deno.test("generate-qr-code: forwards size/format/color/background", async () => {
  const { ctx, calls } = mockCtx([{ body: { url: "x" } }]);
  await action.execute!(
    { message: "hi", size: "Large", format: "svg", color: "#ff0000", background: "#ffffff" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("size"), "Large");
  assertEquals(url.searchParams.get("format"), "svg");
  assertEquals(url.searchParams.get("color"), "#ff0000");
  assertEquals(url.searchParams.get("background"), "#ffffff");
});
