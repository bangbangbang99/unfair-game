## Skills
A skill is a set of local instructions stored in a `SKILL.md` file.

### Available skills
- coding-skill-factory: Create, refine, and apply task-specific coding skills while implementing requests. (file: C:/Users/user/.codex/skills/coding-skill-factory/SKILL.md)
- unfair-game-dev: Develop and debug this unfair-game repository (index.html, styles.css, game.js). (file: C:/Users/user/.codex/skills/unfair-game-dev/SKILL.md)
- skill-creator: Guide for creating or updating skills. (file: C:/Users/user/.codex/skills/.system/skill-creator/SKILL.md)
- skill-installer: Install skills from curated sources or repositories. (file: C:/Users/user/.codex/skills/.system/skill-installer/SKILL.md)

### Auto selection policy
- Codex must choose and apply skills automatically; the user does not need to name a skill.
- For coding tasks, start with `coding-skill-factory`.
- If the task edits this repository, also apply `unfair-game-dev`.
- If the task asks to create or update a skill, apply `skill-creator`.
- If the task asks to list or install skills, apply `skill-installer`.
- If multiple skills apply, use them in this order: `coding-skill-factory` -> domain skill (`unfair-game-dev`) -> installer/creator as needed.

### How to use skills
1) Open the selected skill `SKILL.md` and read only what is needed.
2) Resolve relative references from the skill directory first.
3) Prefer bundled scripts/assets over rewriting from scratch.
4) Keep context small and avoid loading unrelated references.
5) If a skill is missing or unreadable, state that briefly and continue with best effort.
