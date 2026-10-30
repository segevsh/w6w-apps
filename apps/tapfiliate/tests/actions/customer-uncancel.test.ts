import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import customerUncancel from "../../actions/customer-uncancel.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("customer-uncancel: PUTs the status sub-resource", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "cu_eXampl3Pay1ng", status: "paying" } }]);
  const out = await customerUncancel.execute({ id: "cu_eXampl3Pay1ng" }, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(pathOf(calls[0].url), "/1.6/customers/cu_eXampl3Pay1ng/status/");
  assertEquals(calls[0].method, "PUT");
  assertEquals(out.status, "paying");
});
