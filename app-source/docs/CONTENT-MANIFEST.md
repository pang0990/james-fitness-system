# Content completion manifest

The product must never fabricate James-authored videos, recipes or coaching material.

## Exercise / warm-up video

Each exercise and warm-up already supports a nullable video URL. Final completion requires the actual James-owned or licensed video file/URL for each item. Missing video remains visibly unavailable rather than substituted with unrelated footage.

Recommended delivery fields:
- exercise or warm-up id
- final title
- video URL
- thumbnail URL (optional)
- duration
- cue summary
- ownership/license note

## Recipes

The recipe engine is implemented, but the final James recipe collection must come from James. Required fields:
- name
- category
- ingredients with quantities
- steps
- serving count
- P/C/F/kcal per serving
- optional photo/video
- version

No generic AI recipes should be labelled as James recipes.

## Knowledge

The repository already contains imported long-form knowledge articles in `src/content/articles.json`. Completion means reviewing the full curriculum, adding missing modules, verifying source/reference metadata and marking each article as draft/reviewed/published. Existing text should not be silently presented as newly evidence-verified when its source conversation did not preserve portable citations.
