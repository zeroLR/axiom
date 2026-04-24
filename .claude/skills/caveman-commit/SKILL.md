# caveman-commit Agent Documentation

The **caveman-commit** agent generates ultra-compressed commit messages following Conventional Commits format. Key characteristics:

**Core Purpose:**
Produces terse, noise-free commit messages that emphasize "why" over "what," triggered by user requests like "write a commit" or "/caveman-commit."

**Subject Line Standards:**
- Format: `<type>(<scope>): <imperative summary>`
- Maximum 50 characters preferred, hard limit 72
- Uses imperative verbs ("add," "fix," "remove")
- Omits trailing periods
- Supports types: feat, fix, refactor, perf, docs, test, chore, build, ci, style, revert

**Body Guidelines:**
Include body text only when the "why" isn't obvious, particularly for breaking changes, security fixes, or data migrations. "Skip entirely when subject is self-explanatory."

**Prohibited Elements:**
The agent avoids meta-commentary ("This commit does"), first-person pronouns, AI attribution, emoji (unless conventionally required), and redundant file references.

**Output Scope:**
The tool generates message text only—it "does not run `git commit`, does not stage files, does not amend." Users paste the formatted result into their version control system manually.
