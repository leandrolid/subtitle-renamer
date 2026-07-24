use std::ffi::OsString;

use crate::matcher::{EpisodeParseResult, episode_keys_are_compatible, parse_episode_keys};

use super::{CopyPlan, MediaInventory, PlannedCopy, SkipReason, SkippedSubtitle, sort_key};

pub(super) fn build_plan(inventory: &MediaInventory) -> CopyPlan {
    let videos = inventory
        .videos
        .iter()
        .filter_map(|video| match parse_episode_keys(&video.stem) {
            EpisodeParseResult::One(key) => Some((video, key)),
            EpisodeParseResult::None | EpisodeParseResult::Multiple => None,
        })
        .collect::<Vec<_>>();
    let mut candidates = Vec::new();
    let mut skipped = Vec::new();

    for subtitle in &inventory.subtitles {
        let Some(stem) = subtitle.stem.to_str() else {
            skipped.push(SkippedSubtitle {
                source: subtitle.path.clone(),
                reason: SkipReason::UnsupportedName,
            });
            continue;
        };
        let key = match parse_episode_keys(stem) {
            EpisodeParseResult::None => {
                skipped.push(SkippedSubtitle {
                    source: subtitle.path.clone(),
                    reason: SkipReason::NoMatch,
                });
                continue;
            }
            EpisodeParseResult::One(key) => key,
            EpisodeParseResult::Multiple => {
                skipped.push(SkippedSubtitle {
                    source: subtitle.path.clone(),
                    reason: SkipReason::MultiIdentifier,
                });
                continue;
            }
        };
        let mut matches = videos
            .iter()
            .filter(|(_, video_key)| episode_keys_are_compatible(key, *video_key));
        let Some((video, _)) = matches.next() else {
            skipped.push(SkippedSubtitle {
                source: subtitle.path.clone(),
                reason: SkipReason::NoMatch,
            });
            continue;
        };
        if matches.next().is_some() {
            skipped.push(SkippedSubtitle {
                source: subtitle.path.clone(),
                reason: SkipReason::Ambiguous,
            });
            continue;
        }
        let mut name = OsString::from(&video.stem);
        name.push(".");
        name.push(&subtitle.extension);
        let target = video.path.with_file_name(name);
        if subtitle.path == target {
            skipped.push(SkippedSubtitle {
                source: subtitle.path.clone(),
                reason: SkipReason::AlreadyCorrect,
            });
        } else if target.exists() {
            skipped.push(SkippedSubtitle {
                source: subtitle.path.clone(),
                reason: SkipReason::ExistingDestination,
            });
        } else {
            candidates.push(PlannedCopy {
                source: subtitle.path.clone(),
                target,
            });
        }
    }

    candidates.sort_by(|left, right| left.target.cmp(&right.target));
    let mut renames = Vec::new();
    while let Some(first) = candidates.first() {
        let target = first.target.clone();
        let count = candidates.partition_point(|candidate| candidate.target == target);
        if count == 1 {
            renames.extend(candidates.drain(..count));
        } else {
            for candidate in candidates.drain(..count) {
                skipped.push(SkippedSubtitle {
                    source: candidate.source,
                    reason: SkipReason::DuplicateTarget,
                });
            }
        }
    }
    renames.sort_by_key(|plan| sort_key(&plan.source));
    skipped.sort_by_key(|subtitle| sort_key(&subtitle.source));

    CopyPlan { renames, skipped }
}
