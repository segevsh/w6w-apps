import { webhookTrigger } from "../lib/triggers.ts";

/** A blob is created or replaced (Microsoft.Storage.BlobCreated). */
const trigger = webhookTrigger({
  key: "blob-created",
  title: "Blob Created",
  description:
    "Fires when a blob is created or replaced in the storage account, as reported by an Azure Event Grid subscription. The run gets the event type, id and time, the container and blob name, the blob URL, content type and length, blob type, ETag and the full event data.",
  eventType: "Microsoft.Storage.BlobCreated",
  sample: {
    eventType: "Microsoft.Storage.BlobCreated",
    id: "831e1650-001e-001b-66ab-eeb76e069631",
    eventTime: "2026-11-10T10:30:00.0000000Z",
    topic:
      "/subscriptions/sample-subscription-id/resourceGroups/Storage/providers/Microsoft.Storage/storageAccounts/my-storage-account",
    subject: "/blobServices/default/containers/test-container/blobs/new-file.txt",
    container: "test-container",
    blobName: "new-file.txt",
    url: "https://my-storage-account.blob.core.windows.net/test-container/new-file.txt",
    api: "PutBlockList",
    contentType: "text/plain",
    contentLength: 524288,
    blobType: "BlockBlob",
    eTag: "0x8D4BCC2E4835CD0",
    sequencer: "00000000000004420000000000028963",
    data: { api: "PutBlockList", blobType: "BlockBlob" },
  },
});

export default trigger;
