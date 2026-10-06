import { assertEquals } from "@std/assert";
import researchList from "../../actions/research-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("research-list: paginates", async () => {
  const l = mockCtx([{ body: { data: [{ id: "r" }], metadata: { total: 1 } } }]);
  assertEquals(await researchList.execute({ page: 3 }, l.ctx), {
    items: [{ id: "r" }],
    metadata: { total: 1 },
  });
  assertEquals(l.calls[0].url, "https://api.linkup.so/v1/research?page=3");
});
