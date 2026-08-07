#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'EOF'
Usage: versionate.sh --version X.Y.Z

Update the Cargo workspace, Tauri, and npm package versions, then verify the
Rust workspace. X.Y.Z must be a stable semantic version such as 1.2.3.

Options:
  --version X.Y.Z  Version to apply to all manifests
  -h, --help       Show this help
EOF
}

die() {
  printf 'Error: %s\n\n' "$1" >&2
  usage >&2
  exit 1
}

version=''
while (($#)); do
  case "$1" in
    --version)
      [[ -z "$version" ]] || die '--version may only be specified once.'
      (($# >= 2)) || die '--version requires a value.'
      version=$2
      shift 2
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

for command in sed npm cargo; do
  command -v "$command" >/dev/null || die "Required command not found: $command"
done

cargo_version=$(sed -n 's/^version = "\([^"]*\)"$/\1/p' Cargo.toml)
tauri_version=$(sed -n 's/^  "version": "\([^"]*\)",$/\1/p' crates/desktop/tauri.conf.json)
npm_version=$(npm pkg get version | tr -d '"')
[[ -n "$cargo_version" && "$cargo_version" == "$tauri_version" && "$cargo_version" == "$npm_version" ]] ||
  die "Manifest versions are not aligned (Cargo: ${cargo_version:-missing}, Tauri: ${tauri_version:-missing}, npm: ${npm_version:-missing})."

sed -i "s/^version = \"$cargo_version\"$/version = \"$version\"/" Cargo.toml
sed -i "s/^  \"version\": \"$tauri_version\",$/  \"version\": \"$version\",/" crates/desktop/tauri.conf.json
npm version "$version" --no-git-tag-version --allow-same-version
cargo check --workspace
