import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import action from "../actions/license-key-list.ts";

/**
 * `GET /v1/license-keys` lists license key objects ordered by `id` descending
 * (https://docs.lemonsqueezy.com/api/license-keys/list-all-license-keys, verified 2026-11-10), so page 1 is
 * newest first; the action exposes no sort parameter, so the documented default is relied on.
 */
export default pollFromListAction({
  key: "new-license-key",
  title: "New License Key",
  description:
    "The run gets each newly created license key, oldest first, polled from the existing `license-key-list` action in the vendor's documented default order (`id` descending).",
  action: action as unknown as ActionDefinition,
  input: () => ({ pageNumber: 1, pageSize: 100 }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => String((item as { id?: unknown }).id),
  output: [
    {
      "key": "id",
      "type": "string",
      "label": "License Key ID",
    },
    {
      "key": "attributes",
      "type": "object",
      "label": "License Key attributes",
    },
  ],
  sample: {
    "id": "1",
    "type": "license-keys",
    "attributes": {
      "status": "inactive",
      "user_email": "ada@example.com",
      "created_at": "2026-11-09T10:00:00.000000Z",
    },
  },
  maxPages: 1,
});
