#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'EOF'
Usage: versionate.sh --version X.Y.Z [--commit] [--tag] [--push]

Update the Cargo workspace, Tauri, and npm package versions, then verify the
Rust workspace. X.Y.Z must be a stable semantic version such as 1.2.3.

Options:
  --version X.Y.Z  Version to apply to all manifests
  --commit          Commit the updated version files
  --tag             Create a local tag named X.Y.Z
  --push            Push the current branch and all local tags
  -h, --help       Show this help
EOF
}

die() {
  printf 'Error: %s\n\n' "$1" >&2
  usage >&2
  exit 1
}

version=''
commit=false
tag=false
push=false
while (($#)); do
  case "$1" in
    --version)
      [[ -z "$version" ]] || die '--version may only be specified once.'
      (($# >= 2)) || die '--version requires a value.'
      version=$2
      shift 2
      ;;
    --commit)
      [[ "$commit" == false ]] || die '--commit may only be specified once.'
      commit=true
      shift
      ;;
    --tag)
      [[ "$tag" == false ]] || die '--tag may only be specified once.'
      tag=true
      shift
      ;;
    --push)
      [[ "$push" == false ]] || die '--push may only be specified once.'
      push=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      die "Unknown argument: $1"
      ;;
  esac
done

[[ -n "$version" ]] || die '--version is required.'
[[ "$version" =~ ^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$ ]] ||
  die "Invalid version '$version'; expected stable SemVer X.Y.Z."

repo_root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)
cd -- "$repo_root"

commands=(sed npm cargo)
if [[ "$commit" == true || "$tag" == true || "$push" == true ]]; then
  commands+=(git)
fi

for command in "${commands[@]}"; do
  command -v "$command" >/dev/null || die "Required command not found: $command"
done

if [[ "$commit" == true ]] && ! git diff --cached --quiet; then
  die 'Cannot commit while files are already staged.'
fi

cargo_version=$(sed -n 's/^version = "\([^"]*\)"$/\1/p' Cargo.toml)
tauri_version=$(sed -n 's/^  "version": "\([^"]*\)",$/\1/p' crates/desktop/tauri.conf.json)
npm_version=$(npm pkg get version | tr -d '"')
[[ -n "$cargo_version" && "$cargo_version" == "$tauri_version" && "$cargo_version" == "$npm_version" ]] ||
  die "Manifest versions are not aligned (Cargo: ${cargo_version:-missing}, Tauri: ${tauri_version:-missing}, npm: ${npm_version:-missing})."

sed -i "s/^version = \"$cargo_version\"$/version = \"$version\"/" Cargo.toml
sed -i "s/^  \"version\": \"$tauri_version\",$/  \"version\": \"$version\",/" crates/desktop/tauri.conf.json
npm version "$version" --no-git-tag-version --allow-same-version
cargo check --workspace

if [[ "$commit" == true ]]; then
  git add -- crates/desktop/tauri.conf.json Cargo.lock Cargo.toml package-lock.json package.json
  git commit -m "feat: update version to $version"
fi

if [[ "$tag" == true ]]; then
  git tag -a "$version" -m "v$version"
fi

if [[ "$push" == true ]]; then
  git push
  git push origin "v$version"
fi
