import { assertEquals } from "@std/assert";
import extractList from "../../actions/extract-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("extract-list: paginates with the documented query names", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [{ id: "a" }], metadata: { total: 1 } } }]);
  const out = await extractList.execute(
    { page: 2, pageSize: 50, sortBy: "updatedAt", sortDirection: "desc" },
    ctx,
  );
  assertEquals(out, { items: [{ id: "a" }], metadata: { total: 1 } });
  assertEquals(
    calls[0].url,
    "https://api.linkup.so/v1/extract?page=2&pageSize=50&sortBy=updatedAt&sortDirection=desc",
  );
});
