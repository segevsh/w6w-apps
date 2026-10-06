import type { ActionDefinition } from "@w6w/types";
import { FareHarborClient } from "../lib/client.ts";
import { bookingParam, companyParam, seg } from "../lib/params.ts";

interface Input {
  shortname: string;
  bookingUuid: string;
  note: string;
}

const bookingNoteUpdate: ActionDefinition<Input> = {
  key: "booking-note-update",
  type: "perform",
  resource: "booking",
  title: "Update Booking Note",
  description: "Set a booking's note (replaces the existing note).",
  idempotent: true,
  params: [
    companyParam,
    bookingParam,
    {
      key: "note",
      label: "Note",
      type: "text",
      required: true,
    },
  ],
  output: [
    { key: "booking", type: "object", label: "Updated booking" },
  ],

  execute(input, ctx) {
    return new FareHarborClient(ctx).request(
      `/companies/${seg(input.shortname, "shortname")}/bookings/${
        seg(input.bookingUuid, "bookingUuid")
      }/note/`,
      {
        method: "PUT",
        body: { note: input.note ?? "" },
      },
    );
  },
};

export default bookingNoteUpdate;
