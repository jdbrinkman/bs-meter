-- Rubric v3 (1-5 scale, staged pipeline). Additive and nullable. Applied to the live project (BS-Meter,
-- bzbxopevjmurwsajemsc) on 2026-10-29 with the Supabase tool, as migration "rubric_v3"; the re-score writes these columns. Numbered 017 because 016 is
-- reserved for the RLS migration that lives on branch claude/sleepy-curran-87a6d3 (see docs/HANDOFF.md).
ALTER TABLE scores
  ADD COLUMN IF NOT EXISTS issues JSONB,        -- stage 1 observations (with quotes, sources, corroboration)
  ADD COLUMN IF NOT EXISTS provisional BOOLEAN, -- too many measures could not be rated for lack of coverage
  ADD COLUMN IF NOT EXISTS run_meta JSONB;      -- model returned, thinking level, prompt/rubric/schema versions, tokens
