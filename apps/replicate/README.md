# Replicate

- **Triggers** — 1 (poll)

## Triggers

| key — title | mechanism | wrapped action | what the run gets |
| --- | --- | --- | --- |
| `new-prediction` — New Prediction | poll | `prediction-list` | Each newly created prediction. |

Replicate documents that [list predictions is newest first](https://replicate.com/docs/reference/http#predictions.list). Verified 2026-11-09.
