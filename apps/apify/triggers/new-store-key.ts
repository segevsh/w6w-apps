import { newStoreKey } from "../lib/triggers.ts";

// GET /key-value-stores/{storeId}/keys — "Get list of keys": paged by `exclusiveStartKey` in
// UTF-8 binary order, so the key list is snapshot-diffed (lib/triggers.ts).
// https://docs.apify.com/api/v2/key-value-store-keys-get
export default newStoreKey;
