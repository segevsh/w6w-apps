import { extractAction } from "../lib/extract.ts";

/** `GET /v3/event` — single-day event page (beta) */
export default extractAction({
  key: "extract-event",
  api: "event",
  title: "Extract Event (beta)",
  description:
    "Extract a single-day online or in-person event page: dates, location and description. Beta API. 1 credit per page.",
});
