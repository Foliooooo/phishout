# Prediction model

The app predicts, per skill, how likely a player is to miss a warning sign in their
next run, plus an overall risk score. My scores shows it, and the Gemini coach
report uses it.

`lib/prediction.ts` decides where the prediction comes from:

1. **Your custom model.** If `PREDICTION_MODEL_URL` is set, the app POSTs the
   player’s features there (3 s timeout) and validates the answer.
2. **Built-in baseline.** If no URL is set, or your model fails or answers in the
   wrong shape, a Beta-posterior estimate runs in the app instead. My scores
   says which one was used.

## The contract

Request (`POST`, JSON, `version: 1`):

```json
{
  "version": 1, "runs": 6, "missions": 4,
  "decisionAccuracy": 0.78, "falseFlagRate": 0.1, "daysSinceLastRun": 2,
  "skills": [{ "skill": "Sender", "found": 5, "available": 7, "falseFlags": 1, "recentMissRate": 0.25 }, "… 7 skills in order"]
}
```

Skills are always in this order: Sender, Links, Urgency, Authority, Requests,
Attachments, Trust.

Response:

```json
{
  "risk": 34,
  "skills": [{ "missChance": 0.21, "confidence": "high" }, "… 7, same order"],
  "next": "inbox-trap"
}
```

`risk` is 0–100, `missChance` is 0–1, and `confidence` is `low`, `medium` or
`high`. `next` must be a mission slug; the app picks one itself if it isn’t.
Set `PREDICTION_MODEL_TOKEN` to send `Authorization: Bearer <token>`.

## Training data

Sign in to `/admin`, then open `/api/admin/training-data`. It downloads JSON
Lines with one example per run after a player’s first. Each example has
`features` (everything before that run, in the request format above) and
`label` (clues missed per skill and decisions right in that run). It contains no
user IDs or emails.

## Reference model (no dependencies)

A small logistic regression per skill, in plain Python 3:

```bash
python3 model/train.py phishout-training.jsonl
```

```bash
python3 model/serve.py --port 8790
```

Then set `PREDICTION_MODEL_URL=http://127.0.0.1:8790/predict` in `.env.local`
and restart `pnpm dev`. Before it’s trained, it serves the same baseline the app
uses. A skill needs at least 5 labelled examples before its trained weights are
used.
