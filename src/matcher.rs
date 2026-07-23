#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) struct EpisodeKey {
    pub(crate) season: Option<u8>,
    pub(crate) episode: u16,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum EpisodeParseResult {
    None,
    One(EpisodeKey),
    Multiple,
}

pub(crate) fn parse_episode_keys(stem: &str) -> EpisodeParseResult {
    let bytes = stem.as_bytes();
    let mut keys = Vec::new();

    for index in 0..bytes.len() {
        if !is_start_boundary(bytes, index) {
            continue;
        }

        if let Some((key, end)) = parse_token(bytes, index)
            && is_end_boundary(bytes, end)
            && !keys.contains(&key)
        {
            keys.push(key);
        }
    }

    if let Some(key) = parse_bare_tail(bytes)
        && !keys.contains(&key)
    {
        keys.push(key);
    }

    match keys.as_slice() {
        [] => EpisodeParseResult::None,
        [key] => EpisodeParseResult::One(*key),
        [_, ..] => EpisodeParseResult::Multiple,
    }
}

pub(crate) fn episode_keys_are_compatible(left: EpisodeKey, right: EpisodeKey) -> bool {
    left.episode == right.episode
        && match (left.season, right.season) {
            (Some(left_season), Some(right_season)) => left_season == right_season,
            (Some(_), None) | (None, Some(_)) | (None, None) => true,
        }
}

fn parse_token(bytes: &[u8], index: usize) -> Option<(EpisodeKey, usize)> {
    parse_labeled(bytes, index)
        .or_else(|| parse_s_e(bytes, index))
        .or_else(|| parse_x(bytes, index))
}

fn parse_labeled(bytes: &[u8], index: usize) -> Option<(EpisodeKey, usize)> {
    let after_label = strip_ascii_word(bytes, index, b"episode")
        .or_else(|| strip_ascii_word(bytes, index, b"ep"))?;
    let digits_start = skip_separators(bytes, after_label);
    let (episode, end) = parse_number(bytes, digits_start, 4, 999)?;

    Some((
        EpisodeKey {
            season: None,
            episode,
        },
        end,
    ))
}

fn parse_s_e(bytes: &[u8], index: usize) -> Option<(EpisodeKey, usize)> {
    if !ascii_eq(bytes.get(index).copied()?, b's') {
        return None;
    }

    let (season, after_season) = parse_number(bytes, index + 1, 2, 99)?;
    if !ascii_eq(bytes.get(after_season).copied()?, b'e') {
        return None;
    }
    let (episode, end) = parse_number(bytes, after_season + 1, 3, 999)?;

    Some((
        EpisodeKey {
            season: Some(season.try_into().ok()?),
            episode,
        },
        end,
    ))
}

fn parse_x(bytes: &[u8], index: usize) -> Option<(EpisodeKey, usize)> {
    let (season, after_season) = parse_number(bytes, index, 2, 99)?;
    if !ascii_eq(bytes.get(after_season).copied()?, b'x') {
        return None;
    }
    let (episode, end) = parse_number(bytes, after_season + 1, 3, 999)?;

    Some((
        EpisodeKey {
            season: Some(season.try_into().ok()?),
            episode,
        },
        end,
    ))
}

fn parse_bare_tail(bytes: &[u8]) -> Option<EpisodeKey> {
    let mut inside_brackets = false;
    for byte in bytes {
        match *byte {
            b'[' if inside_brackets => return None,
            b'[' => inside_brackets = true,
            b']' if !inside_brackets => return None,
            b']' => inside_brackets = false,
            _ => {}
        }
    }
    if inside_brackets {
        return None;
    }

    let mut end = bytes.len();
    while end > 0 && bytes[end - 1].is_ascii_whitespace() {
        end -= 1;
    }
    while end > 0 && bytes[end - 1] == b']' {
        let open = bytes[..end - 1].iter().rposition(|byte| *byte == b'[')?;
        if open + 1 == end - 1 {
            return None;
        }
        end = open;
        while end > 0 && bytes[end - 1].is_ascii_whitespace() {
            end -= 1;
        }
    }

    let digit_end = end;
    while end > 0 && bytes[end - 1].is_ascii_digit() {
        end -= 1;
    }
    let digit_start = end;
    if !(1..=4).contains(&(digit_end - digit_start)) {
        return None;
    }

    let mut before = digit_start;
    while before > 0 && bytes[before - 1].is_ascii_whitespace() {
        before -= 1;
    }
    if before > 0 && bytes[before - 1] == b'-' {
        before -= 1;
        while before > 0 && bytes[before - 1].is_ascii_whitespace() {
            before -= 1;
        }
        if before > 0 && bytes[before - 1].is_ascii_digit() {
            return None;
        }
    }
    if digit_start > 0 && !bytes[digit_start - 1].is_ascii_whitespace() {
        return None;
    }

    let (episode, parsed_end) = parse_number(bytes, digit_start, 4, 999)?;
    if parsed_end != digit_end {
        return None;
    }
    Some(EpisodeKey {
        season: None,
        episode,
    })
}

fn parse_number(
    bytes: &[u8],
    start: usize,
    max_width: usize,
    max_value: u16,
) -> Option<(u16, usize)> {
    let mut value = 0_u16;
    let mut end = start;

    while end < bytes.len() && end - start < max_width && bytes[end].is_ascii_digit() {
        value = value
            .saturating_mul(10)
            .saturating_add(u16::from(bytes[end] - b'0'));
        end += 1;
    }

    if end == start || value > max_value {
        return None;
    }

    Some((value, end))
}

fn strip_ascii_word(bytes: &[u8], index: usize, word: &[u8]) -> Option<usize> {
    if bytes.len() < index + word.len() {
        return None;
    }

    for offset in 0..word.len() {
        if !ascii_eq(bytes[index + offset], word[offset]) {
            return None;
        }
    }

    Some(index + word.len())
}

fn skip_separators(bytes: &[u8], mut index: usize) -> usize {
    while index < bytes.len()
        && (bytes[index].is_ascii_whitespace() || matches!(bytes[index], b'.' | b'_' | b'-'))
    {
        index += 1;
    }

    index
}

fn is_start_boundary(bytes: &[u8], index: usize) -> bool {
    index == 0 || index == bytes.len() || !bytes[index - 1].is_ascii_alphanumeric()
}

fn is_end_boundary(bytes: &[u8], index: usize) -> bool {
    index == bytes.len() || !bytes[index].is_ascii_alphanumeric()
}

fn ascii_eq(left: u8, right: u8) -> bool {
    left.eq_ignore_ascii_case(&right)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn key(season: Option<u8>, episode: u16) -> EpisodeKey {
        EpisodeKey { season, episode }
    }

    #[test]
    fn parses_supported_forms() {
        // Given: stems using every supported episode-token grammar.
        let cases = [
            ("show episode 1", key(None, 1)),
            ("show EP.001", key(None, 1)),
            ("show ep-01", key(None, 1)),
            ("show S1E2", key(Some(1), 2)),
            ("show s01e002", key(Some(1), 2)),
            ("show 1x2", key(Some(1), 2)),
            ("show ep_0000", key(None, 0)),
            ("show S00E000", key(Some(0), 0)),
        ];

        for (stem, expected) in cases {
            // When: parsing the stem.
            let parsed = parse_episode_keys(stem);

            // Then: one normalized key is returned.
            assert_eq!(parsed, EpisodeParseResult::One(expected));
        }
    }

    #[test]
    fn parses_strict_final_bare_episode_before_metadata() {
        // Given: final bare episode numbers at stem end or before valid trailing metadata.
        let cases = [
            ("Enies Lobby 01", key(None, 1)),
            (
                "[One Pace][375-376] Enies Lobby 01 [1080p][785FB818]",
                key(None, 1),
            ),
            (
                "[One Pace][376-378] Enies Lobby 02 [1080p][495CDC31]",
                key(None, 2),
            ),
            (
                "[One Pace][379-380] Enies Lobby 03 [1080p][861EE2FF]",
                key(None, 3),
            ),
            ("Title 0001 [WEB][ABCDEF]", key(None, 1)),
            ("episode 1 [meta]", key(None, 1)),
            ("0", key(None, 0)),
            ("Title 999", key(None, 999)),
        ];

        for (stem, expected) in cases {
            // When: parsing the complete stem.
            let parsed = parse_episode_keys(stem);

            // Then: one normalized seasonless key is returned.
            assert_eq!(parsed, EpisodeParseResult::One(expected), "{stem}");
        }
    }

    #[test]
    fn rejects_unsafe_bare_episode_shapes() {
        // Given: numeric tails that are not strict bare episode tokens.
        let cases = [
            "movie 2024",
            "[One Pace][375-376]",
            "Title [1080p]",
            "Title [ABC123]",
            "Title 001v2",
            "Title 001-002",
            "Title 001 - 002",
            "Title 01 extra",
            "Title 1000",
            "Title 00001",
            "Title 01 [broken",
            "Title [broken 01",
            "Title ] 01",
            "Title [[meta]] 01",
            "Title 01 []",
            "Title_01",
        ];

        for stem in cases {
            // When: parsing an unsafe bare-number shape.
            let parsed = parse_episode_keys(stem);

            // Then: no bare episode key is inferred.
            assert_eq!(parsed, EpisodeParseResult::None, "{stem}");
        }

        // Given: one labeled key plus a different valid bare tail.
        let distinct = "episode 2 01";

        // When: both identifiers are collected.
        let parsed = parse_episode_keys(distinct);

        // Then: the stem remains unsafe because it has multiple identifiers.
        assert_eq!(parsed, EpisodeParseResult::Multiple);
    }

    #[test]
    fn rejects_release_numbers_and_resolutions() {
        // Given: release tags, embedded forms, over-width ranges, and empty suffixes.
        let cases = [
            "movie 1920x1080",
            "movie 2024",
            "movie 1080p",
            "showS01E02tag",
            "show S123E1",
            "show S1E1000",
            "show 100x1",
            "show 1x1000",
            "show episode 1000",
            "show ep",
            "show ep-",
            "show 01x",
            "alphaep001beta",
            "A1x2B",
        ];

        for stem in cases {
            // When: parsing malformed or forbidden input.
            let parsed = parse_episode_keys(stem);

            // Then: no episode key is inferred.
            assert_eq!(parsed, EpisodeParseResult::None, "{stem}");
        }
    }

    #[test]
    fn deduplicates_equivalent_tokens_and_flags_distinct_keys() {
        // Given: repeated equivalent tokens and a stem with distinct identifiers.
        let repeated = "show S1E2 s01e002 1x2";
        let distinct = "show S1E2 ep 002";

        // When: parsing both stems.
        let repeated_result = parse_episode_keys(repeated);
        let distinct_result = parse_episode_keys(distinct);

        // Then: equivalent keys count once, distinct keys report multiple identifiers.
        assert_eq!(repeated_result, EpisodeParseResult::One(key(Some(1), 2)));
        assert_eq!(distinct_result, EpisodeParseResult::Multiple);
    }

    #[test]
    fn matches_episode_compatibility() {
        // Given: keys with equal/mismatched episodes and optional seasons.
        let season_one_episode_two = key(Some(1), 2);
        let same = key(Some(1), 2);
        let other_season = key(Some(2), 2);
        let no_season = key(None, 2);
        let other_episode = key(Some(1), 3);

        // When/Then: episode equality is mandatory; season equality is mandatory only when both exist.
        assert!(episode_keys_are_compatible(season_one_episode_two, same));
        assert!(!episode_keys_are_compatible(
            season_one_episode_two,
            other_season
        ));
        assert!(episode_keys_are_compatible(
            season_one_episode_two,
            no_season
        ));
        assert!(episode_keys_are_compatible(
            no_season,
            season_one_episode_two
        ));
        assert!(!episode_keys_are_compatible(
            season_one_episode_two,
            other_episode
        ));
    }
}
