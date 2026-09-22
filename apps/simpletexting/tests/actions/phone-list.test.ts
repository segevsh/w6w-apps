import { assertEquals } from "@std/assert";
import phoneList from "../../actions/phone-list.ts";
import { API_ROOT, mockCtx, page, queryOf } from "../_helpers.ts";

const PHONES = [
  { number: "8005551234", name: "Primary phone" },
  { number: "8005559876", name: "Support line" },
];

Deno.test("phone-list: reads the phones page and returns its rows", async () => {
  const { ctx, calls } = mockCtx([{ body: page(PHONES, { totalPages: 1, totalElements: 2 }) }]);
  const result = await phoneList.execute({}, ctx) as { content: unknown[]; totalElements: number };

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, `${API_ROOT}/api/phones`);
  assertEquals(result.content, PHONES);
  assertEquals(result.totalElements, 2);
});

/**
 * The main risk on this endpoint: a send that leaves `accountPhone` blank uses
 * the primary number, so the list is what a workflow reads to choose a sender.
 * Its two page parameters are mislabelled in the vendor's own document, which
 * makes forwarding them verbatim — rather than guessing — the right behaviour.
 */
Deno.test("phone-list: forwards page and size verbatim, and 0 survives", async () => {
  const { ctx, calls } = mockCtx([{ body: page(PHONES) }]);
  await phoneList.execute({ page: 0, size: 500 }, ctx);
  assertEquals(queryOf(calls[0].url), { page: "0", size: "500" });
});

Deno.test("phone-list: prefills the vendor's documented page size", () => {
  const params = phoneList.params ?? [];
  assertEquals(params.find((p) => p.key === "size")?.default, 50);
  assertEquals(params.find((p) => p.key === "size")?.validation, {
    integer: true,
    min: 1,
    max: 500,
  });
  assertEquals(params.find((p) => p.key === "page")?.validation, { integer: true, min: 0 });
});

Deno.test("phone-list: tolerates a body without a content array", async () => {
  const { ctx } = mockCtx([{ body: {} }]);
  const result = await phoneList.execute({}, ctx) as { content: unknown[] };
  assertEquals(result.content, []);
});
