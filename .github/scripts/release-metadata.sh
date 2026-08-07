#!/usr/bin/env bash
# release-metadata.sh — four-source release metadata gate
#
# Normal mode (9 positional args):
#   release-metadata.sh <event-name> <ref-type> <ref-name> <expected-commit> \
#                       <workspace-version> <tauri-version> <package-version> \
#                       <lock-root-version> <lock-package-version>
#
# Self-test mode:
#   release-metadata.sh --self-test
#
# Output (GitHub Actions compatible):
#   version=<version>
#   tag=<tag>
#   commit=<sha>
#   publish=true|false

set -euo pipefail

# ---------------------------------------------------------------------------
# Self-test mode
# ---------------------------------------------------------------------------
if [[ "${1:-}" == "--self-test" ]]; then
  SCRIPT="$(realpath "$0")"
  TMPBASE="${TMPDIR:-/tmp}/release-metadata-selftest-$$"
  mkdir -p "$TMPBASE"

  cleanup() { rm -rf "$TMPBASE"; }
  trap cleanup EXIT

  PASS=0
  FAIL=0

  run_test() {
    local name="$1"; shift
    local expect_success="$1"; shift
    # remaining args forwarded to script
    local output
    local exit_code=0
    output=$(GIT_DIR="$TEST_REPO/.git" GIT_WORK_TREE="$TEST_REPO" \
      bash "$SCRIPT" "$@" 2>&1) || exit_code=$?

    if [[ "$expect_success" == "true" ]]; then
      if [[ $exit_code -ne 0 ]]; then
        echo "FAIL [$name]: expected success (exit 0) but got exit $exit_code"
        echo "  output: $output"
        FAIL=$((FAIL + 1))
      else
        echo "PASS [$name]"
        PASS=$((PASS + 1))
      fi
    else
      if [[ $exit_code -eq 0 ]]; then
        echo "FAIL [$name]: expected nonzero exit but got exit 0"
        echo "  output: $output"
        FAIL=$((FAIL + 1))
      else
        echo "PASS [$name] (correctly rejected)"
        PASS=$((PASS + 1))
      fi
    fi
  }

  # --- Helper: set up a fresh test repo with a bare remote ----------------
  setup_repo() {
    local dir="$TMPBASE/repo-$$-$RANDOM"
    local bare="$TMPBASE/bare-$$-$RANDOM"

    mkdir -p "$bare" "$dir"

    # bare remote
    git -C "$bare" init --bare -q

    # working repo
    git -C "$dir" init -q
    git -C "$dir" config user.email "test@test.test"
    git -C "$dir" config user.name "Test"
    git -C "$dir" remote add origin "$bare"

    # initial commit on main
    echo "init" > "$dir/file.txt"
    git -C "$dir" add file.txt
    git -C "$dir" commit -q -m "init"
    git -C "$dir" branch -M main
    git -C "$dir" push -q origin main

    # fetch so refs/remotes/origin/main exists
    git -C "$dir" fetch -q origin main:refs/remotes/origin/main

    echo "$dir"
  }

  VER="1.2.3"

  # =========================================================================
  # Test 1: Valid workflow_dispatch
  # =========================================================================
  TEST_REPO="$(setup_repo)"
  HEAD="$(git -C "$TEST_REPO" rev-parse HEAD)"
  run_test "workflow_dispatch valid" true \
    workflow_dispatch "" "" "$HEAD" "$VER" "$VER" "$VER" "$VER" "$VER"

  # Verify publish=false
  output="$(GIT_DIR="$TEST_REPO/.git" GIT_WORK_TREE="$TEST_REPO" \
    bash "$SCRIPT" workflow_dispatch "" "" "$HEAD" "$VER" "$VER" "$VER" "$VER" "$VER" 2>&1)"
  if echo "$output" | grep -q "publish=false"; then
    echo "PASS [workflow_dispatch publish=false]"
    PASS=$((PASS + 1))
  else
    echo "FAIL [workflow_dispatch publish=false]: did not find publish=false in: $output"
    FAIL=$((FAIL + 1))
  fi

  # =========================================================================
  # Test 2: Valid annotated tag on main → publish=true
  # =========================================================================
  TEST_REPO="$(setup_repo)"
  git -C "$TEST_REPO" config user.email "test@test.test"
  git -C "$TEST_REPO" config user.name "Test"
  git -C "$TEST_REPO" tag -a "v${VER}" -m "release v${VER}"
  HEAD="$(git -C "$TEST_REPO" rev-parse HEAD)"
  run_test "push annotated tag on main valid" true \
    push tag "v${VER}" "$HEAD" "$VER" "$VER" "$VER" "$VER" "$VER"

  # Verify publish=true
  output="$(GIT_DIR="$TEST_REPO/.git" GIT_WORK_TREE="$TEST_REPO" \
    bash "$SCRIPT" push tag "v${VER}" "$HEAD" "$VER" "$VER" "$VER" "$VER" "$VER" 2>&1)"
  if echo "$output" | grep -q "publish=true"; then
    echo "PASS [push tag publish=true]"
    PASS=$((PASS + 1))
  else
    echo "FAIL [push tag publish=true]: did not find publish=true in: $output"
    FAIL=$((FAIL + 1))
  fi

  # =========================================================================
  # Test 3: HEAD mismatch
  # =========================================================================
  TEST_REPO="$(setup_repo)"
  WRONG_COMMIT="$(printf '%040d' 0)"
  run_test "HEAD mismatch" false \
    workflow_dispatch "" "" "$WRONG_COMMIT" "$VER" "$VER" "$VER" "$VER" "$VER"

  # =========================================================================
  # Test 4: Tag/event-commit mismatch (tag points at different commit)
  # =========================================================================
  TEST_REPO="$(setup_repo)"
  git -C "$TEST_REPO" config user.email "test@test.test"
  git -C "$TEST_REPO" config user.name "Test"
  # Create tag on current HEAD
  git -C "$TEST_REPO" tag -a "v${VER}" -m "release v${VER}"
  # Add another commit so HEAD != tag commit
  echo "extra" >> "$TEST_REPO/file.txt"
  git -C "$TEST_REPO" add file.txt
  git -C "$TEST_REPO" commit -q -m "extra commit"
  git -C "$TEST_REPO" push -q origin main
  git -C "$TEST_REPO" fetch -q origin main:refs/remotes/origin/main
  HEAD="$(git -C "$TEST_REPO" rev-parse HEAD)"
  run_test "tag/event-commit mismatch" false \
    push tag "v${VER}" "$HEAD" "$VER" "$VER" "$VER" "$VER" "$VER"

  # =========================================================================
  # Test 5: Lightweight tag rejection
  # =========================================================================
  TEST_REPO="$(setup_repo)"
  git -C "$TEST_REPO" config user.email "test@test.test"
  git -C "$TEST_REPO" config user.name "Test"
  git -C "$TEST_REPO" tag "v${VER}"   # lightweight (no -a)
  HEAD="$(git -C "$TEST_REPO" rev-parse HEAD)"
  run_test "lightweight tag rejection" false \
    push tag "v${VER}" "$HEAD" "$VER" "$VER" "$VER" "$VER" "$VER"

  # =========================================================================
  # Test 6: Annotated tag off main (tag on a side commit not reachable from origin/main)
  # =========================================================================
  TEST_REPO="$(setup_repo)"
  git -C "$TEST_REPO" config user.email "test@test.test"
  git -C "$TEST_REPO" config user.name "Test"
  # Create an orphan branch so commit is NOT reachable from origin/main
  git -C "$TEST_REPO" checkout -q --orphan side-branch
  echo "side" > "$TEST_REPO/side.txt"
  git -C "$TEST_REPO" add side.txt
  git -C "$TEST_REPO" commit -q -m "side commit"
  SIDE_HEAD="$(git -C "$TEST_REPO" rev-parse HEAD)"
  git -C "$TEST_REPO" tag -a "v${VER}" -m "release v${VER}"
  run_test "annotated tag off main" false \
    push tag "v${VER}" "$SIDE_HEAD" "$VER" "$VER" "$VER" "$VER" "$VER"

  # =========================================================================
  # Tests 7a-7e: Version mismatches (one source differs at a time)
  # =========================================================================
  TEST_REPO="$(setup_repo)"
  HEAD="$(git -C "$TEST_REPO" rev-parse HEAD)"
  BAD="9.9.9"

  run_test "workspace version mismatch" false \
    workflow_dispatch "" "" "$HEAD" "$BAD" "$VER" "$VER" "$VER" "$VER"

  run_test "tauri version mismatch" false \
    workflow_dispatch "" "" "$HEAD" "$VER" "$BAD" "$VER" "$VER" "$VER"

  run_test "package version mismatch" false \
    workflow_dispatch "" "" "$HEAD" "$VER" "$VER" "$BAD" "$VER" "$VER"

  run_test "lock-root version mismatch" false \
    workflow_dispatch "" "" "$HEAD" "$VER" "$VER" "$VER" "$BAD" "$VER"

  run_test "lock-package version mismatch" false \
    workflow_dispatch "" "" "$HEAD" "$VER" "$VER" "$VER" "$VER" "$BAD"

  # =========================================================================
  # Test 8: Prerelease tag rejection
  # =========================================================================
  TEST_REPO="$(setup_repo)"
  git -C "$TEST_REPO" config user.email "test@test.test"
  git -C "$TEST_REPO" config user.name "Test"
  git -C "$TEST_REPO" tag -a "v1.0.0-alpha" -m "prerelease"
  HEAD="$(git -C "$TEST_REPO" rev-parse HEAD)"
  run_test "prerelease tag rejection" false \
    push tag "v1.0.0-alpha" "$HEAD" "1.0.0-alpha" "1.0.0-alpha" "1.0.0-alpha" "1.0.0-alpha" "1.0.0-alpha"

  # =========================================================================
  # Test 9: Leading-zero version rejection
  # =========================================================================
  TEST_REPO="$(setup_repo)"
  git -C "$TEST_REPO" config user.email "test@test.test"
  git -C "$TEST_REPO" config user.name "Test"
  git -C "$TEST_REPO" tag -a "v0.01.0" -m "leading zero"
  HEAD="$(git -C "$TEST_REPO" rev-parse HEAD)"
  run_test "leading-zero version rejection" false \
    push tag "v0.01.0" "$HEAD" "0.01.0" "0.01.0" "0.01.0" "0.01.0" "0.01.0"

  # =========================================================================
  # Test 10: Loose tag format rejection
  # =========================================================================
  TEST_REPO="$(setup_repo)"
  git -C "$TEST_REPO" config user.email "test@test.test"
  git -C "$TEST_REPO" config user.name "Test"
  git -C "$TEST_REPO" tag -a "version-1.0.0" -m "wrong format"
  HEAD="$(git -C "$TEST_REPO" rev-parse HEAD)"
  run_test "loose tag format rejection" false \
    push tag "version-1.0.0" "$HEAD" "1.0.0" "1.0.0" "1.0.0" "1.0.0" "1.0.0"

  # =========================================================================
  # Test 11: Tag/source version mismatch
  # =========================================================================
  TEST_REPO="$(setup_repo)"
  git -C "$TEST_REPO" config user.email "test@test.test"
  git -C "$TEST_REPO" config user.name "Test"
  git -C "$TEST_REPO" tag -a "v${VER}" -m "release v${VER}"
  HEAD="$(git -C "$TEST_REPO" rev-parse HEAD)"
  run_test "tag/source version mismatch" false \
    push tag "v${VER}" "$HEAD" "9.9.9" "9.9.9" "9.9.9" "9.9.9" "9.9.9"

  # =========================================================================
  # Test 12: Missing origin/main ref
  # =========================================================================
  TEST_REPO="$(setup_repo)"
  git -C "$TEST_REPO" config user.email "test@test.test"
  git -C "$TEST_REPO" config user.name "Test"
  # Delete the remote tracking ref
  git -C "$TEST_REPO" update-ref -d refs/remotes/origin/main
  git -C "$TEST_REPO" tag -a "v${VER}" -m "release v${VER}"
  HEAD="$(git -C "$TEST_REPO" rev-parse HEAD)"
  run_test "missing origin/main ref" false \
    push tag "v${VER}" "$HEAD" "$VER" "$VER" "$VER" "$VER" "$VER"

  # =========================================================================
  # Test 13: Unsupported event (push with ref-type=branch)
  # =========================================================================
  TEST_REPO="$(setup_repo)"
  HEAD="$(git -C "$TEST_REPO" rev-parse HEAD)"
  run_test "unsupported event push branch" false \
    push branch "main" "$HEAD" "$VER" "$VER" "$VER" "$VER" "$VER"

  # =========================================================================
  # Summary
  # =========================================================================
  echo ""
  echo "Self-test summary: $PASS passed, $FAIL failed"
  if [[ $FAIL -gt 0 ]]; then
    echo "SELF-TEST FAILED" >&2
    exit 1
  fi
  echo "All self-tests passed."
  exit 0
fi

# ---------------------------------------------------------------------------
# Normal mode
# ---------------------------------------------------------------------------
if [[ $# -ne 9 ]]; then
  echo "Usage: release-metadata.sh <event-name> <ref-type> <ref-name> <expected-commit> <workspace-version> <tauri-version> <package-version> <lock-root-version> <lock-package-version>" >&2
  echo "       release-metadata.sh --self-test" >&2
  exit 1
fi

event_name="$1"
ref_type="$2"
ref_name="$3"
expected_commit="$4"
workspace_version="$5"
tauri_version="$6"
package_version="$7"
lock_root_version="$8"
lock_package_version="$9"

# --- 1. Verify HEAD matches expected-commit --------------------------------
actual_head="$(git rev-parse HEAD 2>/dev/null)" || {
  echo "ERROR: git rev-parse HEAD failed — not in a git repository?" >&2
  exit 1
}
if [[ "$actual_head" != "$expected_commit" ]]; then
  echo "ERROR: HEAD mismatch: expected '$expected_commit', got '$actual_head'" >&2
  exit 1
fi

# --- 2. Verify all five version strings agree ------------------------------
if [[ "$workspace_version" != "$tauri_version" ]] ||
   [[ "$workspace_version" != "$package_version" ]] ||
   [[ "$workspace_version" != "$lock_root_version" ]] ||
   [[ "$workspace_version" != "$lock_package_version" ]]; then
  echo "ERROR: version mismatch across sources:" >&2
  echo "  workspace  : $workspace_version" >&2
  echo "  tauri      : $tauri_version" >&2
  echo "  package    : $package_version" >&2
  echo "  lock-root  : $lock_root_version" >&2
  echo "  lock-pkg   : $lock_package_version" >&2
  exit 1
fi

source_version="$workspace_version"

# ---------------------------------------------------------------------------
# workflow_dispatch: no tag required, publish=false
# ---------------------------------------------------------------------------
if [[ "$event_name" == "workflow_dispatch" ]]; then
  echo "version=${source_version}"
  echo "tag=v${source_version}"
  echo "commit=${expected_commit}"
  echo "publish=false"
  exit 0
fi

# ---------------------------------------------------------------------------
# push + tag: full validation, publish=true
# ---------------------------------------------------------------------------
if [[ "$event_name" == "push" && "$ref_type" == "tag" ]]; then

  # 2a. Strict SemVer: ^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$
  semver_re='^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$'
  if [[ ! "$ref_name" =~ $semver_re ]]; then
    echo "ERROR: ref-name '$ref_name' does not match strict SemVer pattern (^v<M>.<m>.<p>$, no pre-release, no build metadata, no leading zeros)" >&2
    exit 1
  fi

  # 2b. Strip 'v' prefix and compare to source version
  tag_version="${ref_name#v}"
  if [[ "$tag_version" != "$source_version" ]]; then
    echo "ERROR: tag version '$tag_version' != source version '$source_version'" >&2
    exit 1
  fi

  # 2c. Annotated tag check: git cat-file -t must return 'tag' not 'commit'
  tag_type="$(git cat-file -t "refs/tags/${ref_name}" 2>/dev/null)" || {
    echo "ERROR: refs/tags/${ref_name} does not exist or is unreachable" >&2
    exit 1
  }
  if [[ "$tag_type" != "tag" ]]; then
    echo "ERROR: tag '${ref_name}' is not annotated (git cat-file -t returned '$tag_type', expected 'tag')" >&2
    exit 1
  fi

  # 2d. Peeled commit must equal expected-commit
  tag_commit="$(git rev-parse "refs/tags/${ref_name}^{commit}" 2>/dev/null)" || {
    echo "ERROR: could not resolve refs/tags/${ref_name}^{commit}" >&2
    exit 1
  }
  if [[ "$tag_commit" != "$expected_commit" ]]; then
    echo "ERROR: tag commit '$tag_commit' != expected commit '$expected_commit'" >&2
    exit 1
  fi

  # 2e. Commit must be reachable from refs/remotes/origin/main
  if ! git rev-parse refs/remotes/origin/main >/dev/null 2>&1; then
    echo "ERROR: refs/remotes/origin/main does not exist" >&2
    exit 1
  fi
  if ! git merge-base --is-ancestor "$tag_commit" refs/remotes/origin/main 2>/dev/null; then
    echo "ERROR: tag commit '$tag_commit' is not reachable from refs/remotes/origin/main" >&2
    exit 1
  fi

  echo "version=${source_version}"
  echo "tag=${ref_name}"
  echo "commit=${expected_commit}"
  echo "publish=true"
  exit 0
fi

# ---------------------------------------------------------------------------
# Unsupported event/ref-type combination
# ---------------------------------------------------------------------------
echo "ERROR: unsupported event/ref-type combination: event='${event_name}' ref-type='${ref_type}'" >&2
exit 1
