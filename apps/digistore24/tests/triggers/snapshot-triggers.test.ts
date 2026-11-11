import { describe, test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { envelope, mockCtx } from "../_helpers.ts";
import newProduct from "../../triggers/new-product.ts";
import newVoucher from "../../triggers/new-voucher.ts";
import newDelivery, { clock } from "../../triggers/new-delivery.ts";

interface Case {
  name: string;
  trigger: typeof newProduct;
  /** The `data` payload the function answers with. */
  data(records: unknown[]): unknown;
  url: string;
}

const cases: Case[] = [
  {
    name: "new-product",
    trigger: newProduct,
    data: (records) => records,
    url: "https://www.digistore24.com/api/call/listProducts",
  },
  {
    name: "new-voucher",
    trigger: newVoucher,
    data: (coupons) => ({ coupons }),
    url: "https://www.digistore24.com/api/call/listVouchers",
  },
  {
    name: "new-delivery",
    trigger: newDelivery,
    data: (delivery) => ({ delivery }),
    // clock pinned to 1_700_000_000_000 ms (2023-11-14T22:13:20Z) minus 30 days = 2023-10-15
    url: "https://www.digistore24.com/api/call/listDeliveries?search%5Bfrom%5D=2023-10-15",
  },
];

for (const c of cases) {
  describe(c.name, () => {
    const run = async (state: unknown, ids: number[]) => {
      const original = clock.now;
      clock.now = () => 1_700_000_000_000;
      try {
        const m = mockCtx([{ body: envelope(c.data(ids.map((id) => ({ id })))) }]);
        const out = await c.trigger.poll!({ params: {}, state }, m.ctx);
        return { out, calls: m.calls };
      } finally {
        clock.now = original;
      }
    };

    test("seeds without emitting", async () => {
      const { out } = await run({}, [1]);
      assertEquals(out.events, []);
      assertEquals(out.nextState.seeded, true);
    });

    test("emits only the new record, and a retry is identical", async () => {
      const seeded = await run({}, [1]);
      const first = await run(seeded.out.nextState, [1, 2]);
      assertEquals(first.out.events, [{ id: 2 }]);
      assertEquals((await run(seeded.out.nextState, [1, 2])).out, first.out);
    });

    test("requests the literal endpoint", async () => {
      const { calls } = await run({}, [1]);
      assertEquals(calls.length, 1);
      assertEquals(calls[0].method, "GET");
      assertEquals(calls[0].url, c.url);
    });
  });
}
