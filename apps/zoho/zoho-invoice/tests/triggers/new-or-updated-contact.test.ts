import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockInvoiceCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-contact.ts";

const _COLUMN = "last_modified_time";
const BASE = Date.parse("2026-10-01T00:00:00.000Z");
const stampAt = (n: number) => new Date(BASE + n * 60_000).toISOString().replace(".000Z", "+0000");

interface Contact {
  contact_id: string;
  contact_name: string;
  created_time: string;
  last_modified_time: string;
}

/**
 * Fake vendor: the contact list sorted by the requested `sort_column`, in the direction the
 * vendor happens to default to (`asc` or `desc`; the docs do not say), 200 per page, with a
 * `page_context` that may or may not carry `sort_order`. A page past the end is empty.
 */
function vendor(dir: "asc" | "desc", reportOrder: boolean, total: number) {
  const contacts: Contact[] = Array.from({ length: total }, (_, i) => ({
    contact_id: `c${i}`,
    contact_name: `Contact ${i}`,
    created_time: stampAt(i),
    last_modified_time: stampAt(i),
  }));
  let clock = total;
  const mock = mockInvoiceCtx([]);
  mock.ctx.fetch = ((input: RequestInfo | URL) => {
    const url = new URL(String(input));
    mock.calls.push({ url: url.toString(), method: "GET", headers: {}, body: null });
    const page = Number(url.searchParams.get("page"));
    const per = Number(url.searchParams.get("per_page"));
    const col = url.searchParams.get("sort_column") as keyof Contact;
    const sorted = [...contacts].sort((a, b) =>
      (a[col] < b[col] ? -1 : a[col] > b[col] ? 1 : 0) * (dir === "asc" ? 1 : -1)
    );
    const slice = sorted.slice((page - 1) * per, page * per);
    const page_context: Record<string, unknown> = {
      page,
      per_page: per,
      has_more_page: page * per < sorted.length,
      sort_column: col,
    };
    if (reportOrder) page_context.sort_order = dir === "asc" ? "A" : "D";
    return Promise.resolve(
      new Response(JSON.stringify({ code: 0, contacts: slice, page_context }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
  }) as typeof fetch;
  return {
    mock,
    add(id: string) {
      clock++;
      contacts.push({
        contact_id: id,
        contact_name: id,
        created_time: stampAt(clock),
        last_modified_time: stampAt(clock),
      });
    },
    edit(id: string) {
      clock++;
      contacts.find((c) => c.contact_id === id)!.last_modified_time = stampAt(clock);
    },
  };
}

const check = (v: ReturnType<typeof vendor>, state: unknown) =>
  trigger.poll!({ params: {}, subscriptionId: "sub", state }, v.mock.ctx);
const ids = (r: { events: unknown[] }) => (r.events as Contact[]).map((e) => e.contact_id).sort();

test("new-or-updated-contact sends the documented sort column and a literal first request", async () => {
  const v = vendor("desc", true, 3);
  const seeded = await check(v, {});
  assertEquals(seeded.events, []);
  assertEquals(
    new URL(v.mock.calls[0].url).pathname + new URL(v.mock.calls[0].url).search,
    "/invoice/v3/contacts?page=1&per_page=200&sort_column=last_modified_time",
  );
});

for (const dir of ["asc", "desc"] as const) {
  for (const reportOrder of [true, false]) {
    const label = `${dir} default, ${reportOrder ? "sort_order reported" : "sort_order omitted"}`;

    test(`new-or-updated-contact (${label}): 450 contacts span three pages; only the new ones are emitted, once`, async () => {
      const v = vendor(dir, reportOrder, 450);
      const seeded = await check(v, {});
      assertEquals(seeded.events, []);
      v.add("n1");
      v.add("n2");
      v.add("n3");
      const first = await check(v, seeded.nextState);
      const retry = await check(v, seeded.nextState);
      assertEquals(ids(first), ["n1", "n2", "n3"]);
      assertEquals(retry, first);
      const second = await check(v, first.nextState);
      assertEquals(second.events, []);
      assert(v.mock.calls.length < 40, `too many requests: ${v.mock.calls.length}`);
    });

    test(`new-or-updated-contact (${label}): an edit of an existing contact is emitted again`, async () => {
      const v = vendor(dir, reportOrder, 450);
      const seeded = await check(v, {});
      v.edit("c7");
      v.edit("c449");
      const out = await check(v, seeded.nextState);
      assertEquals(ids(out), ["c449", "c7"]);
      const again = await check(v, out.nextState);
      assertEquals(again.events, []);
    });
  }
}

test("new-or-updated-contact reads a single page when the list fits in one", async () => {
  const v = vendor("asc", true, 5);
  const seeded = await check(v, {});
  v.add("n1");
  const out = await check(v, seeded.nextState);
  assertEquals(ids(out), ["n1"]);
  assertEquals(v.mock.calls.length, 2);
});
