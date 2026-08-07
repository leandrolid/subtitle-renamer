import type { Locale } from "./types.ts";

export interface LocaleCatalog {
  text: Record<string, string>;
  skipLabels: Record<string, string>;
  errorLabels: Record<string, string>;
  plurals: Record<string, { one: string; other: string }>;
}

const en: LocaleCatalog = {
  text: {
    metaTitle: "Subtitle Renamer",
    metaDescription: "Copy subtitle files to filenames that match nearby video files.",
    localCopyPlanner: "Local copy planner",
    appTitle: "Subtitle Renamer",
    lede: "Choose a folder, review planned subtitle copies, then confirm the batch. Source subtitles stay in place.",
    selectedFolder: "Selected folder",
    sourceDirectory: "Source directory",
    selectFolder: "Select folder",
    chooseTitle: "Select a media folder to scan",
    chooseBody:
      "Choose the directory that contains your videos and loose subtitle files. Subtitle Renamer previews how each subtitle maps to a video before anything is copied.",
    folderSurfaceBody: "Native folder picker, direct files only.",
    scanFolder: "Scan folder",
    videoFiles: "Video files",
    subtitleFiles: "Subtitle files",
    noFolderSelected: "No folder selected.",
    folderHint: "Only direct files in the chosen folder will be considered.",
    supportedExtensions:
      "Supported videos: mkv, mp4, avi, mov, m4v, webm. Supported subtitles: ass, ssa, srt, vtt.",
    statusLabel: "Status",
    plan: "Plan",
    plannedCopies: "Planned copies",
    skipped: "Skipped",
    skippedFiles: "Skipped files",
    noPlanLoaded: "No plan loaded",
    confirm: "Confirm",
    copyPlannedSubtitles: "Copy planned subtitles?",
    confirmBody:
      "This will copy subtitle contents next to matching videos. It doesn't rename, move, or delete source subtitle files, and existing targets are not overwritten.",
    yesCopy: "Yes, copy",
    cancel: "Cancel",
    completed: "Completed",
    copiedFiles: "Copied files",
    failed: "Failed",
    failedFile: "Failed file",
    pending: "Pending",
    pendingAfterFailure: "Not copied after failure",
    sourceSubtitle: "Source subtitle",
    targetSubtitle: "Target filename",
    targetOrReason: "Target / reason",
    statusColumn: "Status",
    skipReasonColumn: "Reason",
    rescan: "Rescan",
    settings: "Settings",
    windowControls: "Window controls",
    minimizeWindow: "Minimize window",
    maximizeWindow: "Maximize window",
    restoreWindow: "Restore window",
    closeWindow: "Close window",
    theme: "Theme",
    themeSystem: "System",
    themeLight: "Light",
    themeDark: "Dark",
    language: "Language",
    languageEnglish: "English",
    languagePortugueseBrazil: "Português (Brasil)",
    progressLabel: "Workflow progress",
    statusRegionLabel: "Current status",
    supportedFilesLabel: "Supported files",
    planCountsLabel: "Plan counts",
    mapsToLabel: "Maps to",
    copyReviewLabel: "Copy review",
    confirmCopyLabel: "Confirm copy",
    outcomesLabel: "Copy outcome groups",
    actionsLabel: "Actions",
    hostileProbeLabel: "Hostile filename probe",
    progressChooseFolder: "Select folder",
    progressChooseFolderDescription: "Choose a directory",
    progressReviewMapping: "Review mapping",
    progressReviewMappingDescription: "Preview matches",
    progressConfirmCopy: "Confirm copy",
    progressConfirmCopyDescription: "Write subtitles",
    ready: "Ready",
    readyForCopy: "Ready for copy",
    readyCountLabel: "ready",
    skippedCountLabel: "skipped",
    reviewTitle: "Review proposed mapping",
    continue: "Continue",
    back: "Back",
    reviewCurrentPlan: "Review current plan",
    startOver: "Start over",
    copySubtitles: "Copy subtitles",
    copyNotMoveTitle: "Copy, not move",
    copyNotMoveBody: "Subtitle contents are duplicated into matching video filenames.",
    safeDefaultTitle: "Safe by default",
    safeDefaultBody:
      "Source subtitle files stay in place and existing targets are not overwritten.",
    unknownSubtitle: "Unknown subtitle",
    unknownTarget: "Unknown target",
    skippedFallback: "Skipped",
    operationFailed: "Operation failed.",
    partialTargetMayRemain: "Partial target may remain.",
    emptyReadyTitle: "Ready to choose a folder",
    emptyReadyBody:
      "Select a folder to scan direct files and preview subtitle copies before confirming.",
    emptyNoFilesTitle: "No files to copy",
    emptyNoFilesBody:
      "The selected folder has no executable subtitle copies. Source files were not changed.",
    emptyOpeningFolderTitle: "Opening folder picker",
    emptyScanningTitle: "Scanning selected folder",
    emptyPlanningBody: "Review data will replace this message after planning completes.",
    emptyPlanningFailedTitle: "Planning failed",
    emptyPlanningFailedBody:
      "No copy operation ran. Select another folder or rescan the selected folder.",
    emptyDiscardedLocalTitle: "Plan discarded locally",
    emptyDiscardedLocalBody: "The discard command reported an error. No copy operation ran.",
    emptyDiscardedTitle: "Plan discarded",
    emptyDiscardedBody: "No copy operation ran. Source subtitles remain untouched.",
    emptyCopyDidNotRunTitle: "Copy did not run",
    emptyCopyDidNotRunBody:
      "The current plan was not executed. Rescan before trying again.",
    statusWaiting: "Waiting for a folder.",
    statusNoFilesToCopy: "No files to copy.",
    statusSelectionCanceledPreviousPlan:
      "Folder selection canceled. Previous plan is still loaded.",
    statusSelectionCanceledNoFiles: "Folder selection canceled. No files to copy.",
    statusSelectionCanceled: "Folder selection canceled.",
    statusOpeningFolder: "Opening folder picker.",
    statusScanning: "Scanning selected folder.",
    statusConfirming:
      "Confirm to copy the planned subtitles, or cancel to discard this plan.",
    statusDiscarding: "Discarding current plan.",
    statusDeclined: "Copy declined. Source subtitles remain untouched.",
    statusCopying: "Copying planned subtitles.",
    confirmationTargetIntro: "Will create: ",
    statusPartialFailureTail:
      "stopped at the first failure. Pending files were not attempted.",
    statusCompletedTail:
      "Source subtitles remain in place and existing targets were not overwritten.",
  },
  skipLabels: {
    "unsupported-name": "Unsupported filename",
    unsupported_name: "Unsupported filename",
    multi_identifier: "Multiple episode identifiers",
    "multi-identifier": "Multiple episode identifiers",
    no_match: "No matching video",
    "no-match": "No matching video",
    ambiguous: "Ambiguous match",
    already_correct: "Already has target name",
    "already-correct": "Already has target name",
    existing_destination: "Target already exists",
    "existing-destination": "Target already exists",
    duplicate_target: "Duplicate target",
    "duplicate-target": "Duplicate target",
  },
  errorLabels: {
    busy: "Another operation is already running.",
    stale: "That plan is no longer current.",
    "stale-plan": "That plan is no longer current.",
    stale_plan: "That plan is no longer current.",
    unknown: "The plan is unknown.",
    "unknown-plan": "The plan is unknown.",
    unknown_plan: "The plan is unknown.",
    consumed: "That plan was already consumed.",
    discarded: "That plan was already discarded.",
    rescanned: "That plan was replaced by a rescan.",
    "zero-work": "There are no planned copies to execute.",
    zero_work: "There are no planned copies to execute.",
    "planning-failed": "Planning failed.",
    planning_failed: "Planning failed.",
    "copy-failed": "Copy failed.",
    copy_failed: "Copy failed.",
    already_exists: "The target already exists.",
    "already-exists": "The target already exists.",
    not_found: "A source file was not found.",
    "not-found": "A source file was not found.",
    unavailable: "The desktop command bridge is unavailable.",
  },
  plurals: {
    statusPlanReady: {
      one: "{count} subtitle copy ready. Review the plan before confirming.",
      other: "{count} subtitle copies ready. Review the plan before confirming.",
    },
    copiedFiles: {
      one: "Copied {count} file",
      other: "Copied {count} files",
    },
    copyButtonSubtitles: {
      one: "Copy {count} subtitle",
      other: "Copy {count} subtitles",
    },
    confirmCopyCount: {
      one: "{count} subtitle will be copied by content to its matching video filename.",
      other:
        "{count} subtitles will be copied by content to their matching video filenames.",
    },
  },
};

const ptBR: LocaleCatalog = {
  text: {
    metaTitle: "Subtitle Renamer",
    metaDescription: "Interface desktop estática para Subtitle Renamer.",
    localCopyPlanner: "Planejador de cópias locais",
    appTitle: "Subtitle Renamer",
    lede: "Escolha uma pasta, revise as cópias de legendas planejadas e confirme o lote. As legendas de origem permanecem no lugar.",
    selectedFolder: "Pasta selecionada",
    sourceDirectory: "Diretório de origem",
    selectFolder: "Selecionar pasta",
    chooseTitle: "Selecione uma pasta de mídia para escanear",
    chooseBody:
      "Escolha o diretório que contém seus vídeos e legendas soltas. Subtitle Renamer pré-visualiza como cada legenda corresponde a um vídeo antes de copiar qualquer coisa.",
    folderSurfaceBody: "Seletor nativo de pastas, somente arquivos diretos.",
    scanFolder: "Escanear pasta",
    videoFiles: "Arquivos de vídeo",
    subtitleFiles: "Arquivos de legenda",
    noFolderSelected: "Nenhuma pasta selecionada.",
    folderHint: "Somente arquivos diretos na pasta escolhida serão considerados.",
    supportedExtensions:
      "Vídeos suportados: mkv, mp4, avi, mov, m4v, webm. Legendas suportadas: ass, ssa, srt, vtt.",
    statusLabel: "Status",
    plan: "Plano",
    plannedCopies: "Cópias planejadas",
    skipped: "Ignorados",
    skippedFiles: "Arquivos ignorados",
    noPlanLoaded: "Nenhum plano carregado",
    confirm: "Confirmar",
    copyPlannedSubtitles: "Copiar legendas planejadas?",
    confirmBody:
      "Isto copia o conteúdo das legendas ao lado dos vídeos correspondentes. Não renomeia, move nem exclui as legendas de origem, e destinos existentes não são sobrescritos.",
    yesCopy: "Sim, copiar",
    cancel: "Cancelar",
    completed: "Concluídos",
    copiedFiles: "Arquivos copiados",
    failed: "Falhou",
    failedFile: "Arquivo com falha",
    pending: "Pendentes",
    pendingAfterFailure: "Não copiados após a falha",
    sourceSubtitle: "Legenda de origem",
    targetSubtitle: "Nome de destino",
    targetOrReason: "Destino / motivo",
    statusColumn: "Status",
    skipReasonColumn: "Motivo",
    rescan: "Reescanear",
    settings: "Configurações",
    windowControls: "Controles da janela",
    minimizeWindow: "Minimizar janela",
    maximizeWindow: "Maximizar janela",
    restoreWindow: "Restaurar janela",
    closeWindow: "Fechar janela",
    theme: "Tema",
    themeSystem: "Sistema",
    themeLight: "Claro",
    themeDark: "Escuro",
    language: "Idioma",
    languageEnglish: "Inglês",
    languagePortugueseBrazil: "Português (Brasil)",
    progressLabel: "Progresso do fluxo",
    statusRegionLabel: "Status atual",
    supportedFilesLabel: "Arquivos suportados",
    planCountsLabel: "Contagens do plano",
    mapsToLabel: "Mapeia para",
    copyReviewLabel: "Revisão das cópias",
    confirmCopyLabel: "Confirmar cópia",
    outcomesLabel: "Grupos de resultado da cópia",
    actionsLabel: "Ações",
    hostileProbeLabel: "Teste de nome de arquivo hostil",
    progressChooseFolder: "Selecionar pasta",
    progressChooseFolderDescription: "Escolha um diretório",
    progressReviewMapping: "Revisar mapeamento",
    progressReviewMappingDescription: "Pré-visualize correspondências",
    progressConfirmCopy: "Confirmar cópia",
    progressConfirmCopyDescription: "Gravar legendas",
    ready: "Pronto",
    readyForCopy: "Pronto para copiar",
    readyCountLabel: "prontas",
    skippedCountLabel: "ignoradas",
    reviewTitle: "Revisar mapeamento proposto",
    continue: "Continuar",
    back: "Voltar",
    reviewCurrentPlan: "Revisar plano atual",
    startOver: "Começar de novo",
    copySubtitles: "Copiar legendas",
    copyNotMoveTitle: "Copiar, não mover",
    copyNotMoveBody: "O conteúdo das legendas é duplicado com nomes de vídeo correspondentes.",
    safeDefaultTitle: "Seguro por padrão",
    safeDefaultBody:
      "As legendas de origem permanecem no lugar e destinos existentes não são sobrescritos.",
    unknownSubtitle: "Legenda desconhecida",
    unknownTarget: "Destino desconhecido",
    skippedFallback: "Ignorado",
    operationFailed: "A operação falhou.",
    partialTargetMayRemain: "O destino parcial pode permanecer.",
    emptyReadyTitle: "Pronto para escolher uma pasta",
    emptyReadyBody:
      "Selecione uma pasta para escanear arquivos diretos e pré-visualizar cópias de legendas antes de confirmar.",
    emptyNoFilesTitle: "Nenhum arquivo para copiar",
    emptyNoFilesBody:
      "A pasta selecionada não tem cópias de legendas executáveis. Os arquivos de origem não foram alterados.",
    emptyOpeningFolderTitle: "Abrindo seletor de pasta",
    emptyScanningTitle: "Escaneando pasta selecionada",
    emptyPlanningBody: "Os dados de revisão substituirão esta mensagem quando o planejamento terminar.",
    emptyPlanningFailedTitle: "O planejamento falhou",
    emptyPlanningFailedBody:
      "Nenhuma operação de cópia foi executada. Selecione outra pasta ou reescaneie a pasta selecionada.",
    emptyDiscardedLocalTitle: "Plano descartado localmente",
    emptyDiscardedLocalBody:
      "O comando de descarte relatou um erro. Nenhuma operação de cópia foi executada.",
    emptyDiscardedTitle: "Plano descartado",
    emptyDiscardedBody:
      "Nenhuma operação de cópia foi executada. As legendas de origem permanecem intactas.",
    emptyCopyDidNotRunTitle: "A cópia não foi executada",
    emptyCopyDidNotRunBody:
      "O plano atual não foi executado. Reescaneie antes de tentar novamente.",
    statusWaiting: "Aguardando uma pasta.",
    statusNoFilesToCopy: "Nenhum arquivo para copiar.",
    statusSelectionCanceledPreviousPlan:
      "Seleção de pasta cancelada. O plano anterior ainda está carregado.",
    statusSelectionCanceledNoFiles: "Seleção de pasta cancelada. Nenhum arquivo para copiar.",
    statusSelectionCanceled: "Seleção de pasta cancelada.",
    statusOpeningFolder: "Abrindo seletor de pasta.",
    statusScanning: "Escaneando pasta selecionada.",
    statusConfirming:
      "Confirme para copiar as legendas planejadas ou cancele para descartar este plano.",
    statusDiscarding: "Descartando plano atual.",
    statusDeclined: "Cópia recusada. As legendas de origem permanecem intactas.",
    statusCopying: "Copiando legendas planejadas.",
    confirmationTargetIntro: "Criará: ",
    statusPartialFailureTail:
      "parou na primeira falha. Arquivos pendentes não foram tentados.",
    statusCompletedTail:
      "As legendas de origem permanecem no lugar e destinos existentes não foram sobrescritos.",
  },
  skipLabels: {
    "unsupported-name": "Nome de arquivo sem suporte",
    unsupported_name: "Nome de arquivo sem suporte",
    multi_identifier: "Vários identificadores de episódio",
    "multi-identifier": "Vários identificadores de episódio",
    no_match: "Nenhum vídeo correspondente",
    "no-match": "Nenhum vídeo correspondente",
    ambiguous: "Correspondência ambígua",
    already_correct: "Já tem o nome de destino",
    "already-correct": "Já tem o nome de destino",
    existing_destination: "Destino já existe",
    "existing-destination": "Destino já existe",
    duplicate_target: "Destino duplicado",
    "duplicate-target": "Destino duplicado",
  },
  errorLabels: {
    busy: "Outra operação já está em execução.",
    stale: "Esse plano não é mais atual.",
    "stale-plan": "Esse plano não é mais atual.",
    stale_plan: "Esse plano não é mais atual.",
    unknown: "O plano é desconhecido.",
    "unknown-plan": "O plano é desconhecido.",
    unknown_plan: "O plano é desconhecido.",
    consumed: "Esse plano já foi consumido.",
    discarded: "Esse plano já foi descartado.",
    rescanned: "Esse plano foi substituído por um novo escaneamento.",
    "zero-work": "Não há cópias planejadas para executar.",
    zero_work: "Não há cópias planejadas para executar.",
    "planning-failed": "O planejamento falhou.",
    planning_failed: "O planejamento falhou.",
    "copy-failed": "A cópia falhou.",
    copy_failed: "A cópia falhou.",
    already_exists: "O destino já existe.",
    "already-exists": "O destino já existe.",
    not_found: "Um arquivo de origem não foi encontrado.",
    "not-found": "Um arquivo de origem não foi encontrado.",
    unavailable: "A ponte de comandos do desktop está indisponível.",
  },
  plurals: {
    statusPlanReady: {
      one: "{count} cópia de legenda pronta. Revise o plano antes de confirmar.",
      other: "{count} cópias de legendas prontas. Revise o plano antes de confirmar.",
    },
    copiedFiles: {
      one: "Copiou {count} arquivo",
      other: "Copiou {count} arquivos",
    },
    copyButtonSubtitles: {
      one: "Copiar {count} legenda",
      other: "Copiar {count} legendas",
    },
    confirmCopyCount: {
      one: "{count} legenda será copiada pelo conteúdo para o nome de vídeo correspondente.",
      other:
        "{count} legendas serão copiadas pelo conteúdo para os nomes de vídeo correspondentes.",
    },
  },
};

export const catalogs: Record<Locale, LocaleCatalog> = { en, "pt-BR": ptBR };

const pluralRulesCache = new Map<string, Intl.PluralRules>();

function pluralRuleFor(locale: string): Intl.PluralRules {
  if (!pluralRulesCache.has(locale)) {
    pluralRulesCache.set(locale, new Intl.PluralRules(locale));
  }
  return pluralRulesCache.get(locale)!;
}

export function getText(locale: Locale, key: string): string {
  return catalogs[locale]?.text[key] ?? catalogs.en.text[key] ?? key;
}

export function getPluralText(locale: Locale, key: string, value: number): string {
  const count = Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
  const catalog = catalogs[locale] ?? catalogs.en;
  const forms = catalog.plurals[key] ?? catalogs.en.plurals[key];
  const category = pluralRuleFor(locale).select(count);
  return ((forms as Record<string, string>)[category] ?? forms.other).replaceAll(
    "{count}",
    String(count),
  );
}

export function getSkipLabel(locale: Locale, code: string): string {
  const key = String(code ?? "").trim();
  return catalogs[locale]?.skipLabels[key] ?? getText(locale, "skippedFallback");
}

export function getErrorLabel(locale: Locale, code: string): string {
  const key = String(code ?? "").trim();
  return catalogs[locale]?.errorLabels[key] ?? getText(locale, "operationFailed");
}

export function systemLocale(): Locale {
  const languages = Array.isArray(navigator.languages) ? navigator.languages : [];
  for (const lang of languages) {
    if (lang.toLowerCase() === "pt-br" || lang.toLowerCase() === "pt") {
      return "pt-BR";
    }
  }
  return "en";
}
