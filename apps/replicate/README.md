# Replicate

- **Triggers** — 6 (poll)

## Triggers

| key — title | mechanism | wrapped action | what the run gets |
| --- | --- | --- | --- |
| `new-prediction` — New Prediction | poll | `prediction-list` | Each newly created prediction. |
| `new-training` — New Training | poll | `training-list` | Each newly created training (fine-tune). |
| `new-deployment` — New Deployment | poll | `deployment-list` | Each newly created deployment. |
| `new-model` — New Public Model | poll | `model-list` (`sort_by=model_created_at&sort_direction=desc`) | Each public model newly created on Replicate. |
| `new-or-updated-model` — New or Updated Public Model | poll | `model-list` (default `latest_version_created_at` order) | Each public model when it is created or publishes a new latest version. |
| `new-model-version` — New Model Version | poll | `model-version-list` | Each new version of one model (`owner/name` param). |

Replicate documents that predictions, trainings, deployments and model versions are each listed
newest first, and that `GET /models` takes `sort_by` / `sort_direction`; see
[the HTTP API reference](https://replicate.com/docs/reference/http) and its
[OpenAPI document](https://api.replicate.com/openapi.json). Verified 2026-11-10.

Not covered: `hardware-list` (static reference data), `collection-list` (a catalogue curated by
Replicate staff, no recency order), `model-search` (relevance-ranked free-text search with no
recency order; `model-list` backs the model triggers).
