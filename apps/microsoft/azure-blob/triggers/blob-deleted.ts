import { webhookTrigger } from "../lib/triggers.ts";

/** A blob is deleted (Microsoft.Storage.BlobDeleted). */
const trigger = webhookTrigger({
  key: "blob-deleted",
  title: "Blob Deleted",
  description:
    "Fires when a blob is deleted from the storage account, as reported by an Azure Event Grid subscription. The run gets the event type, id and time, the container and blob name, the blob URL, content type, blob type and the full event data.",
  eventType: "Microsoft.Storage.BlobDeleted",
  sample: {
    eventType: "Microsoft.Storage.BlobDeleted",
    id: "831e1650-001e-001b-66ab-eeb76e069631",
    eventTime: "2026-11-10T10:30:00.0000000Z",
    topic:
      "/subscriptions/sample-subscription-id/resourceGroups/Storage/providers/Microsoft.Storage/storageAccounts/my-storage-account",
    subject: "/blobServices/default/containers/test-container/blobs/new-file.txt",
    container: "test-container",
    blobName: "new-file.txt",
    url: "https://my-storage-account.blob.core.windows.net/test-container/new-file.txt",
    api: "DeleteBlob",
    contentType: "text/plain",
    contentLength: null,
    blobType: "BlockBlob",
    eTag: null,
    sequencer: "00000000000004420000000000028963",
    data: { api: "DeleteBlob", blobType: "BlockBlob" },
  },
});

export default trigger;
