#!/usr/bin/env bash
# prepare-release.sh — release preparation helpers
#
# Subcommands:
#   prepare <tag> <repository> <dist-dir> <notes-path>
#       Validates tag, checks asset list, generates checksums and release notes.
#
#   classify-status <http-status>
#       Exit 0 only for 404. Exit 1 for 200 (already exists) or anything else.
#
#   verify-remote-tag <remote> <tag> <expected-commit>
#       Confirms remote annotated tag peels to expected commit.
#
#   --self-test
#       Runs all test cases, exits 0 if all pass.

set -euo pipefail

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

semver_re='^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$'

# Compare two version tuples (M N P) numerically.
# Returns 0 if $1.$2.$3 > $4.$5.$6, 1 otherwise.
version_gt() {
  local ma="$1" mi="$2" pa="$3" mb="$4" ni="$5" pb="$6"
  if   (( ma > mb )); then return 0
  elif (( ma < mb )); then return 1
  elif (( mi > ni )); then return 0
  elif (( mi < ni )); then return 1
  elif (( pa > pb )); then return 0
  else return 1
  fi
}

# ---------------------------------------------------------------------------
# prepare subcommand
# ---------------------------------------------------------------------------
cmd_prepare() {
  if [[ $# -ne 4 ]]; then
    echo "Usage: prepare-release.sh prepare <tag> <repository> <dist-dir> <notes-path>" >&2
    exit 1
  fi

  local tag="$1"
  local repository="$2"
  local dist_dir="$3"
  local notes_path="$4"

  # 1. Validate strict SemVer tag
  if [[ ! "$tag" =~ $semver_re ]]; then
    echo "ERROR: tag '$tag' does not match strict SemVer pattern ^v<M>.<m>.<p>$" >&2
    exit 1
  fi

  # Parse numeric tuple
  local tag_strip="${tag#v}"
  local tag_major tag_minor tag_patch
  IFS='.' read -r tag_major tag_minor tag_patch <<< "$tag_strip"

  # 2. Assert dist-dir contains EXACTLY the 5 expected asset basenames
  local expected_assets=(
    "subtitle-renamer-desktop-windows-x86_64-nsis.exe"
    "subtitle-renamer-desktop-linux-x86_64.deb"
    "subtitle-renamer-desktop-linux-x86_64.AppImage"
    "subtitle-renamer-cli-windows-x86_64.exe"
    "subtitle-renamer-cli-linux-x86_64"
  )

  for asset in "${expected_assets[@]}"; do
    if [[ ! -f "${dist_dir}/${asset}" ]]; then
      echo "ERROR: expected asset missing: ${dist_dir}/${asset}" >&2
      exit 1
    fi
  done

  # Check for extra files (before checksums.txt is created)
  local actual_count
  actual_count=$(find "$dist_dir" -maxdepth 1 -type f | wc -l)
  if [[ "$actual_count" -ne 5 ]]; then
    echo "ERROR: dist-dir must contain exactly 5 assets, found $actual_count" >&2
    find "$dist_dir" -maxdepth 1 -type f >&2
    exit 1
  fi

  # 3. Collect reachable strict stable SemVer annotated tags
  # Get all annotated tags reachable from HEAD
  local all_tags
  all_tags=$(git tag --sort=-version:refname --merged HEAD 2>/dev/null || true)

  local prev_tag=""
  local prev_major=0 prev_minor=0 prev_patch=0

  while IFS= read -r t; do
    [[ -z "$t" ]] && continue
    # Must match strict SemVer
    [[ ! "$t" =~ $semver_re ]] && continue
    # Must be annotated
    local ttype
    ttype=$(git cat-file -t "refs/tags/${t}" 2>/dev/null || true)
    [[ "$ttype" != "tag" ]] && continue

    local t_strip="${t#v}"
    local t_maj t_min t_pat
    IFS='.' read -r t_maj t_min t_pat <<< "$t_strip"

    # Skip the tag we're preparing (exact match)
    if [[ "$t_maj" -eq "$tag_major" && "$t_min" -eq "$tag_minor" && "$t_pat" -eq "$tag_patch" ]]; then
      continue
    fi

    # Fail if any reachable tag is greater than current tag
    if version_gt "$t_maj" "$t_min" "$t_pat" "$tag_major" "$tag_minor" "$tag_patch"; then
      echo "ERROR: reachable tag '$t' ($t_maj.$t_min.$t_pat) is greater than release tag '$tag' ($tag_major.$tag_minor.$tag_patch) — non-monotonic" >&2
      exit 1
    fi

    # Track the greatest lower tag
    if version_gt "$t_maj" "$t_min" "$t_pat" "$prev_major" "$prev_minor" "$prev_patch"; then
      prev_tag="$t"
      prev_major="$t_maj"
      prev_minor="$t_min"
      prev_patch="$t_pat"
    fi
  done <<< "$all_tags"

  # 4. Generate commit notes
  local commit_list=""
  local history_link=""

  if [[ -z "$prev_tag" ]]; then
    # First release: all reachable history
    history_link="https://github.com/${repository}/commits/${tag}"
    while IFS= read -r line; do
      [[ -z "$line" ]] && continue
      local short_sha full_sha subject
      short_sha="${line%% *}"
      full_sha=$(git rev-parse "${short_sha}" 2>/dev/null || echo "${short_sha}")
      subject="${line#* }"
      commit_list="${commit_list}- ${short_sha} ${subject} (https://github.com/${repository}/commit/${full_sha})"$'\n'
    done < <(git log --format="%h %s" HEAD 2>/dev/null || true)
  else
    # Later release: range from previous tag
    history_link="https://github.com/${repository}/compare/${prev_tag}...${tag}"
    while IFS= read -r line; do
      [[ -z "$line" ]] && continue
      local short_sha full_sha subject
      short_sha="${line%% *}"
      full_sha=$(git rev-parse "${short_sha}" 2>/dev/null || echo "${short_sha}")
      subject="${line#* }"
      commit_list="${commit_list}- ${short_sha} ${subject} (https://github.com/${repository}/commit/${full_sha})"$'\n'
    done < <(git log --format="%h %s" "${prev_tag}..HEAD" 2>/dev/null || true)
  fi

  # Strip trailing newline from commit_list
  commit_list="${commit_list%$'\n'}"

  # 5. Write sorted SHA-256 checksums (only the 5 asset files)
  local checksums_path="${dist_dir}/checksums.txt"
  (
    cd "$dist_dir"
    sha256sum "${expected_assets[@]}" | sort > checksums.txt
  )

  # 6. Assert dist-dir now contains exactly 6 files
  local final_count
  final_count=$(find "$dist_dir" -maxdepth 1 -type f | wc -l)
  if [[ "$final_count" -ne 6 ]]; then
    echo "ERROR: dist-dir should contain exactly 6 files after checksums, found $final_count" >&2
    find "$dist_dir" -maxdepth 1 -type f >&2
    exit 1
  fi
  if [[ ! -f "$checksums_path" ]]; then
    echo "ERROR: checksums.txt was not created at $checksums_path" >&2
    exit 1
  fi

  # 7. Write release notes
  cat > "$notes_path" <<NOTES
## Changes

${commit_list}

---

Full history: ${history_link}
NOTES

  echo "Release notes written to: $notes_path"
  echo "Checksums written to: $checksums_path"
  exit 0
}

# ---------------------------------------------------------------------------
# classify-status subcommand
# ---------------------------------------------------------------------------
cmd_classify_status() {
  if [[ $# -ne 1 ]]; then
    echo "Usage: prepare-release.sh classify-status <http-status>" >&2
    exit 1
  fi

  local status="$1"

  case "$status" in
    404)
      echo "HTTP 404: release does not exist — safe to create" >&2
      exit 0
      ;;
    200)
      echo "HTTP 200: release already exists — fail closed, will not overwrite" >&2
      exit 1
      ;;
    *)
      echo "HTTP ${status}: unexpected status — fail closed" >&2
      exit 1
      ;;
  esac
}

# ---------------------------------------------------------------------------
# verify-remote-tag subcommand
# ---------------------------------------------------------------------------
cmd_verify_remote_tag() {
  if [[ $# -ne 3 ]]; then
    echo "Usage: prepare-release.sh verify-remote-tag <remote> <tag> <expected-commit>" >&2
    exit 1
  fi

  local remote="$1"
  local tag="$2"
  local expected_commit="$3"

  # Validate expected-commit is 40 hex chars
  if [[ ! "$expected_commit" =~ ^[0-9a-f]{40}$ ]]; then
    echo "ERROR: expected-commit '$expected_commit' is not a valid 40-char hex SHA" >&2
    exit 1
  fi

  # Run ls-remote freshly
  local ls_output
  ls_output=$(git ls-remote --tags "$remote" "refs/tags/${tag}" "refs/tags/${tag}^{}" 2>&1) || {
    echo "ERROR: git ls-remote failed: $ls_output" >&2
    exit 1
  }

  if [[ -z "$ls_output" ]]; then
    echo "ERROR: tag '${tag}' not found on remote '${remote}'" >&2
    exit 1
  fi

  # Count tag-object row (refs/tags/<tag> without ^{})
  local tag_obj_rows
  tag_obj_rows=$(echo "$ls_output" | grep -E $'\t'"refs/tags/${tag}$" | wc -l)

  # Count peeled row (refs/tags/<tag>^{})
  local peeled_rows
  peeled_rows=$(echo "$ls_output" | grep -E $'\t'"refs/tags/${tag}\^\{\}$" | wc -l)

  # Must have exactly one tag-object row
  if [[ "$tag_obj_rows" -ne 1 ]]; then
    echo "ERROR: expected exactly 1 tag-object row for '${tag}', found $tag_obj_rows" >&2
    echo "ls-remote output:" >&2
    echo "$ls_output" >&2
    exit 1
  fi

  # Must have exactly one peeled row (annotated tag requirement)
  if [[ "$peeled_rows" -ne 1 ]]; then
    echo "ERROR: tag '${tag}' has no peeled row — it is a lightweight tag or missing (expected annotated tag)" >&2
    echo "ls-remote output:" >&2
    echo "$ls_output" >&2
    exit 1
  fi

  # Extract the peeled commit SHA
  local peeled_commit
  peeled_commit=$(echo "$ls_output" | grep -E $'\t'"refs/tags/${tag}\^\{\}$" | awk '{print $1}')

  # Validate it's a 40-char hex SHA
  if [[ ! "$peeled_commit" =~ ^[0-9a-f]{40}$ ]]; then
    echo "ERROR: peeled commit '$peeled_commit' is malformed (not a 40-char hex SHA)" >&2
    exit 1
  fi

  # Must equal expected-commit
  if [[ "$peeled_commit" != "$expected_commit" ]]; then
    echo "ERROR: remote tag '${tag}' peels to commit '$peeled_commit' but expected '$expected_commit' — tag may have been force-moved" >&2
    exit 1
  fi

  echo "OK: remote tag '${tag}' on '${remote}' is annotated and peels to expected commit $expected_commit" >&2
  exit 0
}

# ---------------------------------------------------------------------------
# --self-test mode
# ---------------------------------------------------------------------------
if [[ "${1:-}" == "--self-test" ]]; then
  SCRIPT="$(realpath "$0")"
  TMPBASE="${TMPDIR:-/tmp}/prepare-release-selftest-$$"
  mkdir -p "$TMPBASE"

  cleanup() { rm -rf "$TMPBASE"; }
  trap cleanup EXIT

  PASS=0
  FAIL=0

  assert_exit() {
    local name="$1"
    local expected_exit="$2"
    shift 2
    local actual_exit=0
    local output
    output=$("$@" 2>&1) || actual_exit=$?
    if [[ "$actual_exit" -eq "$expected_exit" ]]; then
      echo "PASS [$name]"
      PASS=$((PASS + 1))
    else
      echo "FAIL [$name]: expected exit $expected_exit, got $actual_exit"
      echo "  output: $output"
      FAIL=$((FAIL + 1))
    fi
  }

  assert_output_contains() {
    local name="$1"
    local needle="$2"
    local haystack="$3"
    if echo "$haystack" | grep -qF "$needle"; then
      echo "PASS [$name: contains '$needle']"
      PASS=$((PASS + 1))
    else
      echo "FAIL [$name: expected to contain '$needle']"
      echo "  actual: $haystack"
      FAIL=$((FAIL + 1))
    fi
  }

  # Helper: create a fresh test repo with bare origin
  setup_repo() {
    local dir="${TMPBASE}/repo-${RANDOM}-$$"
    local bare="${TMPBASE}/bare-${RANDOM}-$$"
    mkdir -p "$bare" "$dir"
    git -C "$bare" init --bare -q
    git -C "$dir" init -q
    git -C "$dir" config user.email "test@test.test"
    git -C "$dir" config user.name "Test"
    git -C "$dir" remote add origin "$bare"
    echo "init" > "$dir/file.txt"
    git -C "$dir" add file.txt
    git -C "$dir" commit -q -m "initial commit"
    git -C "$dir" branch -M main
    git -C "$dir" push -q origin main
    git -C "$dir" fetch -q origin main:refs/remotes/origin/main
    echo "$dir"
  }

  make_dist() {
    local d="${TMPBASE}/dist-${RANDOM}-$$"
    mkdir -p "$d"
    touch "$d/subtitle-renamer-desktop-windows-x86_64-nsis.exe"
    touch "$d/subtitle-renamer-desktop-linux-x86_64.deb"
    touch "$d/subtitle-renamer-desktop-linux-x86_64.AppImage"
    touch "$d/subtitle-renamer-cli-windows-x86_64.exe"
    touch "$d/subtitle-renamer-cli-linux-x86_64"
    echo "$d"
  }

  # =========================================================================
  # Test 1: prepare — valid first-release, notes have history link
  # =========================================================================
  REPO1="$(setup_repo)"
  DIST1="$(make_dist)"
  NOTES1="${TMPBASE}/notes1-$$.md"
  out1=""
  exit1=0
  out1=$(cd "$REPO1" && bash "$SCRIPT" prepare v0.1.0 test/repo "$DIST1" "$NOTES1" 2>&1) || exit1=$?
  if [[ "$exit1" -ne 0 ]]; then
    echo "FAIL [prepare first-release]: exit $exit1"
    echo "  output: $out1"
    FAIL=$((FAIL + 1))
  else
    echo "PASS [prepare first-release: exit 0]"
    PASS=$((PASS + 1))
    # Check notes have history link
    notes_content="$(cat "$NOTES1" 2>/dev/null || true)"
    assert_output_contains "prepare first-release history link" \
      "https://github.com/test/repo/commits/v0.1.0" "$notes_content"
    # Check checksums.txt was created
    if [[ -f "${DIST1}/checksums.txt" ]]; then
      echo "PASS [prepare first-release: checksums.txt created]"
      PASS=$((PASS + 1))
    else
      echo "FAIL [prepare first-release: checksums.txt missing]"
      FAIL=$((FAIL + 1))
    fi
  fi

  # =========================================================================
  # Test 2: prepare — valid later-release (v0.1.0 → v0.2.0), comparison link
  # =========================================================================
  REPO2="$(setup_repo)"
  # Create v0.1.0 annotated tag on initial commit
  git -C "$REPO2" tag -a v0.1.0 -m "release v0.1.0"
  # Add a second commit
  echo "second" >> "$REPO2/file.txt"
  git -C "$REPO2" add file.txt
  git -C "$REPO2" commit -q -m "second commit"
  git -C "$REPO2" push -q origin main
  git -C "$REPO2" fetch -q origin main:refs/remotes/origin/main

  DIST2="$(make_dist)"
  NOTES2="${TMPBASE}/notes2-$$.md"
  out2=""
  exit2=0
  out2=$(cd "$REPO2" && bash "$SCRIPT" prepare v0.2.0 test/repo "$DIST2" "$NOTES2" 2>&1) || exit2=$?
  if [[ "$exit2" -ne 0 ]]; then
    echo "FAIL [prepare later-release]: exit $exit2"
    echo "  output: $out2"
    FAIL=$((FAIL + 1))
  else
    echo "PASS [prepare later-release: exit 0]"
    PASS=$((PASS + 1))
    notes2_content="$(cat "$NOTES2" 2>/dev/null || true)"
    assert_output_contains "prepare later-release comparison link" \
      "https://github.com/test/repo/compare/v0.1.0...v0.2.0" "$notes2_content"
  fi

  # =========================================================================
  # Test 3: prepare — non-monotonic tag (reachable v0.2.0 > current v0.1.0)
  # =========================================================================
  REPO3="$(setup_repo)"
  # Tag the current commit as v0.2.0 (higher)
  git -C "$REPO3" tag -a v0.2.0 -m "release v0.2.0"
  DIST3="$(make_dist)"
  NOTES3="${TMPBASE}/notes3-$$.md"
  exit3=0
  cd "$REPO3" && bash "$SCRIPT" prepare v0.1.0 test/repo "$DIST3" "$NOTES3" >/dev/null 2>&1 || exit3=$?
  cd - >/dev/null
  if [[ "$exit3" -ne 0 ]]; then
    echo "PASS [prepare non-monotonic: correctly rejected]"
    PASS=$((PASS + 1))
  else
    echo "FAIL [prepare non-monotonic: expected failure, got exit 0]"
    FAIL=$((FAIL + 1))
  fi

  # =========================================================================
  # Test 4: prepare — missing asset → fail
  # =========================================================================
  REPO4="$(setup_repo)"
  DIST4="${TMPBASE}/dist4-$$"
  mkdir -p "$DIST4"
  touch "$DIST4/subtitle-renamer-desktop-windows-x86_64-nsis.exe"
  touch "$DIST4/subtitle-renamer-desktop-linux-x86_64.deb"
  # Missing: AppImage, Windows CLI, Linux CLI
  NOTES4="${TMPBASE}/notes4-$$.md"
  exit4=0
  cd "$REPO4" && bash "$SCRIPT" prepare v0.1.0 test/repo "$DIST4" "$NOTES4" >/dev/null 2>&1 || exit4=$?
  cd - >/dev/null
  if [[ "$exit4" -ne 0 ]]; then
    echo "PASS [prepare missing-asset: correctly rejected]"
    PASS=$((PASS + 1))
  else
    echo "FAIL [prepare missing-asset: expected failure, got exit 0]"
    FAIL=$((FAIL + 1))
  fi

  # =========================================================================
  # Test 5: prepare — extra asset → fail
  # =========================================================================
  REPO5="$(setup_repo)"
  DIST5="$(make_dist)"
  touch "${DIST5}/extra-unexpected-file.txt"
  NOTES5="${TMPBASE}/notes5-$$.md"
  exit5=0
  cd "$REPO5" && bash "$SCRIPT" prepare v0.1.0 test/repo "$DIST5" "$NOTES5" >/dev/null 2>&1 || exit5=$?
  cd - >/dev/null
  if [[ "$exit5" -ne 0 ]]; then
    echo "PASS [prepare extra-asset: correctly rejected]"
    PASS=$((PASS + 1))
  else
    echo "FAIL [prepare extra-asset: expected failure, got exit 0]"
    FAIL=$((FAIL + 1))
  fi

  # =========================================================================
  # Test 6: classify-status 404 → success (exit 0)
  # =========================================================================
  assert_exit "classify-status 404" 0 bash "$SCRIPT" classify-status 404

  # =========================================================================
  # Test 7: classify-status 200 → fail (exit 1)
  # =========================================================================
  assert_exit "classify-status 200" 1 bash "$SCRIPT" classify-status 200

  # =========================================================================
  # Test 8: classify-status 422 → fail (exit 1)
  # =========================================================================
  assert_exit "classify-status 422" 1 bash "$SCRIPT" classify-status 422

  # =========================================================================
  # Test 9: verify-remote-tag — valid annotated tag → success
  # =========================================================================
  REPO9="$(setup_repo)"
  BARE9=$(git -C "$REPO9" remote get-url origin)
  COMMIT9="$(git -C "$REPO9" rev-parse HEAD)"
  git -C "$REPO9" tag -a v1.0.0 -m "release v1.0.0"
  git -C "$REPO9" push -q origin refs/tags/v1.0.0
  assert_exit "verify-remote-tag valid" 0 \
    bash "$SCRIPT" verify-remote-tag "$BARE9" v1.0.0 "$COMMIT9"

  # =========================================================================
  # Test 10: verify-remote-tag — force-moved (peels to different commit) → fail
  # =========================================================================
  REPO10="$(setup_repo)"
  BARE10=$(git -C "$REPO10" remote get-url origin)
  COMMIT10_orig="$(git -C "$REPO10" rev-parse HEAD)"
  git -C "$REPO10" tag -a v1.0.0 -m "release v1.0.0"
  git -C "$REPO10" push -q origin refs/tags/v1.0.0
  # Add a new commit, force-move the tag
  echo "extra" >> "$REPO10/file.txt"
  git -C "$REPO10" add file.txt
  git -C "$REPO10" commit -q -m "extra"
  git -C "$REPO10" tag -f -a v1.0.0 -m "moved tag" >/dev/null 2>&1
  git -C "$REPO10" push -q --force origin refs/tags/v1.0.0
  # verify against original commit → should fail
  assert_exit "verify-remote-tag force-moved" 1 \
    bash "$SCRIPT" verify-remote-tag "$BARE10" v1.0.0 "$COMMIT10_orig"

  # =========================================================================
  # Test 11: verify-remote-tag — lightweight remote tag → fail
  # =========================================================================
  REPO11="$(setup_repo)"
  BARE11=$(git -C "$REPO11" remote get-url origin)
  COMMIT11="$(git -C "$REPO11" rev-parse HEAD)"
  git -C "$REPO11" tag v1.0.0   # lightweight
  git -C "$REPO11" push -q origin refs/tags/v1.0.0
  assert_exit "verify-remote-tag lightweight" 1 \
    bash "$SCRIPT" verify-remote-tag "$BARE11" v1.0.0 "$COMMIT11"

  # =========================================================================
  # Test 12: verify-remote-tag — missing remote tag → fail
  # =========================================================================
  REPO12="$(setup_repo)"
  BARE12=$(git -C "$REPO12" remote get-url origin)
  COMMIT12="$(git -C "$REPO12" rev-parse HEAD)"
  # Do NOT push any tag
  assert_exit "verify-remote-tag missing" 1 \
    bash "$SCRIPT" verify-remote-tag "$BARE12" v1.0.0 "$COMMIT12"

  # =========================================================================
  # Test 13: verify-remote-tag — malformed commit hash → fail
  # =========================================================================
  REPO13="$(setup_repo)"
  BARE13=$(git -C "$REPO13" remote get-url origin)
  git -C "$REPO13" tag -a v1.0.0 -m "release v1.0.0"
  git -C "$REPO13" push -q origin refs/tags/v1.0.0
  assert_exit "verify-remote-tag malformed-commit" 1 \
    bash "$SCRIPT" verify-remote-tag "$BARE13" v1.0.0 "not-a-sha"

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
# Dispatch subcommands
# ---------------------------------------------------------------------------
if [[ $# -lt 1 ]]; then
  echo "Usage: prepare-release.sh <prepare|classify-status|verify-remote-tag|--self-test> [args...]" >&2
  exit 1
fi

subcmd="$1"
shift

case "$subcmd" in
  prepare)
    cmd_prepare "$@"
    ;;
  classify-status)
    cmd_classify_status "$@"
    ;;
  verify-remote-tag)
    cmd_verify_remote_tag "$@"
    ;;
  *)
    echo "ERROR: unknown subcommand '$subcmd'" >&2
    echo "Usage: prepare-release.sh <prepare|classify-status|verify-remote-tag|--self-test> [args...]" >&2
    exit 1
    ;;
esac
