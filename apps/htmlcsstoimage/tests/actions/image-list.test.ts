import { assertEquals } from "@std/assert";
import imageList from "../../actions/image-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const page = {
  images: [{ id: "a", url: "https://hcti.io/v1/image/a", created_at: "2026-10-01T00:00:00Z" }],
  next_page_token: "tok",
  has_next_page: true,
};

Deno.test("image-list: sends count and page_token, returns the page as is", async () => {
  const { ctx, calls } = mockCtx([{ body: page }]);
  const out = await imageList.execute({ count: 20, page_token: "prev" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/images");
  assertEquals(queryOf(calls[0].url), { count: "20", page_token: "prev" });
  assertEquals(out, page);
});

Deno.test("image-list: no params means no query string", async () => {
  const { ctx, calls } = mockCtx([{
    body: { images: [], next_page_token: "", has_next_page: false },
  }]);
  await imageList.execute({}, ctx);
  assertEquals(queryOf(calls[0].url), {});
});

Deno.test("image-list: declares the vendor's 1-50 page size", () => {
  const count = imageList.params!.find((p) => p.key === "count")!;
  assertEquals(count.validation, { min: 1, max: 50, integer: true });
});
