import { webhookTrigger } from "../lib/triggers.ts";

/** Notion webhook event `page.transcription_block.transcript_deleted`. */
export default webhookTrigger({
  key: "page-transcript-deleted",
  title: "Page Transcript Deleted",
  description:
    "Fires when the transcript of a meeting-notes transcription block on a page is deleted. The run gets the event, the page id, the block and the transcript id.",
  eventTypes: ["page.transcription_block.transcript_deleted"],
  sample: {
    "id": "367cba44-b6f3-4c92-81e7-6a2e9659efd4",
    "type": "page.transcription_block.transcript_deleted",
    "timestamp": "2026-11-10T09:00:00.000Z",
    "workspaceId": "13950b26-c203-4f3b-b97d-93ec06319565",
    "workspaceName": "Acme Workspace",
    "subscriptionId": "29d75c0d-5546-4414-8459-7b7a92f1fc4b",
    "integrationId": "0ef2e755-4912-8096-91c1-00376a88a5ca",
    "entityId": "153104cd-477e-809d-8dc4-ff2d96ae3090",
    "entityType": "page",
    "authors": [
      {
        "id": "c7c11cca-1d73-471d-9b6e-bdef51470190",
        "type": "person",
      },
    ],
    "data": {
      "target": {
        "id": "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
        "type": "block",
      },
      "transcript_id": "4b3c2d1e-6f5a-4b7c-9d8e-1f0a2b3c4d5e",
    },
    "attemptNumber": 1,
    "verificationToken": null,
  },
});
