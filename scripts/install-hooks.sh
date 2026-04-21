#!/bin/sh
# One-time installer for local git hooks.
#
# Native git hooks (zero-dep alternative to husky) — run once per clone:
#   chmod +x scripts/install-hooks.sh
#   ./scripts/install-hooks.sh
#
# Installs:
#   .git/hooks/pre-push — runs `npm run test:schema` to catch n8n schema drift
#                        before it hits production (AI-DATA-04)
#
# Idempotent: overwrites any existing pre-push hook. Safe to re-run after pulls.

set -e

REPO_ROOT="$(git rev-parse --show-toplevel)"
HOOK_DIR="$REPO_ROOT/.git/hooks"

mkdir -p "$HOOK_DIR"

cat > "$HOOK_DIR/pre-push" <<'HOOK'
#!/bin/sh
# Schema drift guard — fails push if jobs-db.ts references columns absent from
# the live n8n DB. Installed by scripts/install-hooks.sh (AI-DATA-04).
npm run test:schema || exit 1
HOOK

chmod +x "$HOOK_DIR/pre-push"
echo "Installed .git/hooks/pre-push — runs 'npm run test:schema' before every push."
