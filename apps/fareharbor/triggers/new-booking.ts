import type { TriggerDefinition } from "@w6w/types";
import { pollNewItems } from "../../_shared/poll/mod.ts";
import bookingListByCreateDate from "../actions/booking-list-by-create-date.ts";

interface Booking {
  pk?: unknown;
  uuid?: unknown;
  status?: unknown;
}

const DAY_MS = 86_400_000;
const utcDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/**
 * `GET …/minimal/bookings-by-create-date/{date}/` takes a UTC calendar day. Each check asks for
 * today and yesterday (UTC) so a booking created just before midnight is still seen on the next
 * check, and dedupes by `pk` through the kit.
 */
const trigger: TriggerDefinition<{ shortname: string }> = {
  key: "new-booking",
  title: "New Booking",
  description:
    "The run gets each booking newly created for a FareHarbor company (minimal record: pk, uuid, status).",
  params: [{
    key: "shortname",
    label: "Company shortname",
    type: "string",
    required: true,
    hint: "The company's FareHarbor shortname, as listed by List Companies.",
  }],
  output: [
    { key: "pk", type: "number", label: "Booking pk" },
    { key: "uuid", type: "string", label: "Booking UUID" },
    { key: "status", type: "string", label: "Booking status" },
  ],
  sample: { pk: 1234567, uuid: "5d1a6c1e-6b3e-4d5e-9c1a-3f2d7c9e0a11", status: "booked" },
  minIntervalMs: 300_000,
  async poll({ params, state }, ctx) {
    const now = Date.now();
    return await pollNewItems<Booking>({
      state,
      maxPages: 1,
      maxEvents: 100,
      seenWindow: 1000,
      idOf: (booking) => String(booking.pk ?? ""),
      async fetchPage() {
        const items: Booking[] = [];
        for (const day of [utcDay(now), utcDay(now - DAY_MS)]) {
          const out = await bookingListByCreateDate.execute({
            shortname: params.shortname,
            date: day,
          }, ctx) as {
            bookings?: Booking[];
          };
          if (Array.isArray(out?.bookings)) items.push(...out.bookings);
        }
        return { items };
      },
    });
  },
};

export default trigger;
