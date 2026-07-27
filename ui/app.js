(() => {
  "use strict";

  const phases = Object.freeze({
    IDLE: "idle",
    SELECTING: "selecting",
    SCANNING: "scanning",
    PLAN_READY: "plan-ready",
    PLAN_EMPTY: "plan-empty",
    CONFIRMING: "confirming",
    EXECUTING: "executing",
    COMPLETED: "completed",
    DECLINED: "declined",
    PLANNING_FAILURE: "planning-failure",
    PARTIAL_FAILURE: "partial-failure",
    EXECUTION_FAILURE: "execution-failure",
  });

  const selectors = {
    shell: "[data-shell-root]",
    status: "[data-status-message]",
    folder: "[data-folder-label] bdi",
    folderLabels: "[data-folder-label] bdi, [data-review-folder]",
    reviewFolder: "[data-review-folder]",
    hostile: "[data-hostile-output]",
    emptyState: "[data-empty-state]",
    plannedArea: "[data-planned-area]",
    plannedCount: "[data-planned-count]",
    plannedList: "[data-planned-list]",
    skippedArea: "[data-skipped-area]",
    skippedCount: "[data-skipped-count]",
    skippedList: "[data-skipped-list]",
    confirmation: "[data-confirmation]",
    confirmationCount: "[data-confirmation-count]",
    confirmationList: "[data-confirmation-list]",
    outcomes: "[data-outcomes]",
    completedGroup: "[data-outcome-group='completed']",
    completedList: "[data-completed-list]",
    failedGroup: "[data-outcome-group='failed']",
    failedList: "[data-failed-list]",
    pendingGroup: "[data-outcome-group='pending']",
    pendingList: "[data-pending-list]",
    selectButton: "[data-action='select-folder']",
    selectButtons: "[data-action='select-folder']",
    rescanButton: "[data-action='rescan']",
    reviewButton: "[data-action='review-plan']",
    backButton: "[data-action='back']",
    startOverButton: "[data-action='start-over']",
    copyButton: "[data-action='copy']",
    confirmButton: "[data-action='confirm-copy']",
    cancelButton: "[data-action='cancel-copy']",
    progressSteps: "[data-progress-step]",
    settingsButton: "[data-action='settings']",
    settingsMenu: "#settings-menu",
    submenuButtons: "[aria-haspopup='menu'][aria-controls]",
    themeChoices: "[data-theme-choice]",
    localeChoices: "[data-locale-choice]",
    dynamicGroups: "[data-dynamic-group]",
    buttons: "button",
  };

  const visibleSteps = Object.freeze({
    CHOOSE: "choose-folder",
    REVIEW: "review-plan",
    CONFIRM: "confirm-copy",
  });

  const locales = Object.freeze({
    EN: "en",
    PT_BR: "pt-BR",
  });

  const themes = Object.freeze({
    SYSTEM: "system",
    LIGHT: "light",
    DARK: "dark",
  });

  const preferenceStorageKeys = Object.freeze({
    locale: "subtitle-renamer.locale",
    theme: "subtitle-renamer.theme",
  });

  const catalogs = Object.freeze({
    en: Object.freeze({
      text: Object.freeze({
        metaTitle: "Subtitle Renamer",
        metaDescription: "Static desktop shell for Subtitle Renamer.",
        localCopyPlanner: "Local copy planner",
        appTitle: "Subtitle Renamer",
        lede: "Choose a folder, review planned subtitle copies, then confirm the batch. Source subtitles stay in place.",
        selectedFolder: "Selected folder",
        sourceDirectory: "Source directory",
        selectFolder: "Select folder",
        chooseTitle: "Select a media folder to scan",
        chooseBody: "Choose the directory that contains your videos and loose subtitle files. Subtitle Renamer previews how each subtitle maps to a video before anything is copied.",
        folderSurfaceBody: "Native folder picker, direct files only.",
        scanFolder: "Scan folder",
        videoFiles: "Video files",
        subtitleFiles: "Subtitle files",
        noFolderSelected: "No folder selected.",
        folderHint: "Only direct files in the chosen folder will be considered.",
        supportedExtensions: "Supported videos: mkv, mp4, avi, mov, m4v, webm. Supported subtitles: ass, ssa, srt, vtt.",
        statusLabel: "Status",
        plan: "Plan",
        plannedCopies: "Planned copies",
        skipped: "Skipped",
        skippedFiles: "Skipped files",
        noPlanLoaded: "No plan loaded",
        confirm: "Confirm",
        copyPlannedSubtitles: "Copy planned subtitles?",
        confirmBody: "This will copy subtitle contents next to matching videos. It doesn't rename, move, or delete source subtitle files, and existing targets are not overwritten.",
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
        safeDefaultBody: "Source subtitle files stay in place and existing targets are not overwritten.",
        unknownSubtitle: "Unknown subtitle",
        unknownTarget: "Unknown target",
        skippedFallback: "Skipped",
        operationFailed: "Operation failed.",
        partialTargetMayRemain: "Partial target may remain.",
        emptyReadyTitle: "Ready to choose a folder",
        emptyReadyBody: "Select a folder to scan direct files and preview subtitle copies before confirming.",
        emptyNoFilesTitle: "No files to copy",
        emptyNoFilesBody: "The selected folder has no executable subtitle copies. Source files were not changed.",
        emptyOpeningFolderTitle: "Opening folder picker",
        emptyScanningTitle: "Scanning selected folder",
        emptyPlanningBody: "Review data will replace this message after planning completes.",
        emptyPlanningFailedTitle: "Planning failed",
        emptyPlanningFailedBody: "No copy operation ran. Select another folder or rescan the selected folder.",
        emptyDiscardedLocalTitle: "Plan discarded locally",
        emptyDiscardedLocalBody: "The discard command reported an error. No copy operation ran.",
        emptyDiscardedTitle: "Plan discarded",
        emptyDiscardedBody: "No copy operation ran. Source subtitles remain untouched.",
        emptyCopyDidNotRunTitle: "Copy did not run",
        emptyCopyDidNotRunBody: "The current plan was not executed. Rescan before trying again.",
        statusWaiting: "Waiting for a folder.",
        statusNoFilesToCopy: "No files to copy.",
        statusSelectionCanceledPreviousPlan: "Folder selection canceled. Previous plan is still loaded.",
        statusSelectionCanceledNoFiles: "Folder selection canceled. No files to copy.",
        statusSelectionCanceled: "Folder selection canceled.",
        statusOpeningFolder: "Opening folder picker.",
        statusScanning: "Scanning selected folder.",
        statusConfirming: "Confirm to copy the planned subtitles, or cancel to discard this plan.",
        statusDiscarding: "Discarding current plan.",
        statusDeclined: "Copy declined. Source subtitles remain untouched.",
        statusCopying: "Copying planned subtitles.",
        confirmationTargetIntro: "Will create: ",
        statusPartialFailureTail: "stopped at the first failure. Pending files were not attempted.",
        statusCompletedTail: "Source subtitles remain in place and existing targets were not overwritten.",
      }),
      skipLabels: Object.freeze({
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
      }),
      errorLabels: Object.freeze({
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
      }),
      plurals: Object.freeze({
        statusPlanReady: Object.freeze({
          one: "{count} subtitle copy ready. Review the plan before confirming.",
          other: "{count} subtitle copies ready. Review the plan before confirming.",
        }),
        copiedFiles: Object.freeze({
          one: "Copied {count} file",
          other: "Copied {count} files",
        }),
        copyButtonSubtitles: Object.freeze({
          one: "Copy {count} subtitle",
          other: "Copy {count} subtitles",
        }),
        confirmCopyCount: Object.freeze({
          one: "{count} subtitle will be copied by content to its matching video filename.",
          other: "{count} subtitles will be copied by content to their matching video filenames.",
        }),
      }),
    }),
    "pt-BR": Object.freeze({
      text: Object.freeze({
        metaTitle: "Subtitle Renamer",
        metaDescription: "Interface desktop estática para Subtitle Renamer.",
        localCopyPlanner: "Planejador de cópias locais",
        appTitle: "Subtitle Renamer",
        lede: "Escolha uma pasta, revise as cópias de legendas planejadas e confirme o lote. As legendas de origem permanecem no lugar.",
        selectedFolder: "Pasta selecionada",
        sourceDirectory: "Diretório de origem",
        selectFolder: "Selecionar pasta",
        chooseTitle: "Selecione uma pasta de mídia para escanear",
        chooseBody: "Escolha o diretório que contém seus vídeos e legendas soltas. Subtitle Renamer pré-visualiza como cada legenda corresponde a um vídeo antes de copiar qualquer coisa.",
        folderSurfaceBody: "Seletor nativo de pastas, somente arquivos diretos.",
        scanFolder: "Escanear pasta",
        videoFiles: "Arquivos de vídeo",
        subtitleFiles: "Arquivos de legenda",
        noFolderSelected: "Nenhuma pasta selecionada.",
        folderHint: "Somente arquivos diretos na pasta escolhida serão considerados.",
        supportedExtensions: "Vídeos suportados: mkv, mp4, avi, mov, m4v, webm. Legendas suportadas: ass, ssa, srt, vtt.",
        statusLabel: "Status",
        plan: "Plano",
        plannedCopies: "Cópias planejadas",
        skipped: "Ignorados",
        skippedFiles: "Arquivos ignorados",
        noPlanLoaded: "Nenhum plano carregado",
        confirm: "Confirmar",
        copyPlannedSubtitles: "Copiar legendas planejadas?",
        confirmBody: "Isto copia o conteúdo das legendas ao lado dos vídeos correspondentes. Não renomeia, move nem exclui as legendas de origem, e destinos existentes não são sobrescritos.",
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
        safeDefaultBody: "As legendas de origem permanecem no lugar e destinos existentes não são sobrescritos.",
        unknownSubtitle: "Legenda desconhecida",
        unknownTarget: "Destino desconhecido",
        skippedFallback: "Ignorado",
        operationFailed: "A operação falhou.",
        partialTargetMayRemain: "O destino parcial pode permanecer.",
        emptyReadyTitle: "Pronto para escolher uma pasta",
        emptyReadyBody: "Selecione uma pasta para escanear arquivos diretos e pré-visualizar cópias de legendas antes de confirmar.",
        emptyNoFilesTitle: "Nenhum arquivo para copiar",
        emptyNoFilesBody: "A pasta selecionada não tem cópias de legendas executáveis. Os arquivos de origem não foram alterados.",
        emptyOpeningFolderTitle: "Abrindo seletor de pasta",
        emptyScanningTitle: "Escaneando pasta selecionada",
        emptyPlanningBody: "Os dados de revisão substituirão esta mensagem quando o planejamento terminar.",
        emptyPlanningFailedTitle: "O planejamento falhou",
        emptyPlanningFailedBody: "Nenhuma operação de cópia foi executada. Selecione outra pasta ou reescaneie a pasta selecionada.",
        emptyDiscardedLocalTitle: "Plano descartado localmente",
        emptyDiscardedLocalBody: "O comando de descarte relatou um erro. Nenhuma operação de cópia foi executada.",
        emptyDiscardedTitle: "Plano descartado",
        emptyDiscardedBody: "Nenhuma operação de cópia foi executada. As legendas de origem permanecem intactas.",
        emptyCopyDidNotRunTitle: "A cópia não foi executada",
        emptyCopyDidNotRunBody: "O plano atual não foi executado. Reescaneie antes de tentar novamente.",
        statusWaiting: "Aguardando uma pasta.",
        statusNoFilesToCopy: "Nenhum arquivo para copiar.",
        statusSelectionCanceledPreviousPlan: "Seleção de pasta cancelada. O plano anterior ainda está carregado.",
        statusSelectionCanceledNoFiles: "Seleção de pasta cancelada. Nenhum arquivo para copiar.",
        statusSelectionCanceled: "Seleção de pasta cancelada.",
        statusOpeningFolder: "Abrindo seletor de pasta.",
        statusScanning: "Escaneando pasta selecionada.",
        statusConfirming: "Confirme para copiar as legendas planejadas ou cancele para descartar este plano.",
        statusDiscarding: "Descartando plano atual.",
        statusDeclined: "Cópia recusada. As legendas de origem permanecem intactas.",
        statusCopying: "Copiando legendas planejadas.",
        confirmationTargetIntro: "Criará: ",
        statusPartialFailureTail: "parou na primeira falha. Arquivos pendentes não foram tentados.",
        statusCompletedTail: "As legendas de origem permanecem no lugar e destinos existentes não foram sobrescritos.",
      }),
      skipLabels: Object.freeze({
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
      }),
      errorLabels: Object.freeze({
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
      }),
      plurals: Object.freeze({
        statusPlanReady: Object.freeze({
          one: "{count} cópia de legenda pronta. Revise o plano antes de confirmar.",
          other: "{count} cópias de legendas prontas. Revise o plano antes de confirmar.",
        }),
        copiedFiles: Object.freeze({
          one: "Copiou {count} arquivo",
          other: "Copiou {count} arquivos",
        }),
        copyButtonSubtitles: Object.freeze({
          one: "Copiar {count} legenda",
          other: "Copiar {count} legendas",
        }),
        confirmCopyCount: Object.freeze({
          one: "{count} legenda será copiada pelo conteúdo para o nome de vídeo correspondente.",
          other: "{count} legendas serão copiadas pelo conteúdo para os nomes de vídeo correspondentes.",
        }),
      }),
    }),
  });

  const pluralRules = new Map();

  const staticTextBindings = Object.freeze([
    [".shell__title-group .eyebrow", "localCopyPlanner"],
    ["h1", "appTitle"],
    [".lede", "lede"],
    ["[data-action='settings']", "settings"],
    ["[data-action='open-theme-menu']", "theme"],
    ["[data-theme-choice='system']", "themeSystem"],
    ["[data-theme-choice='light']", "themeLight"],
    ["[data-theme-choice='dark']", "themeDark"],
    ["[data-action='open-language-menu']", "language"],
    ["[data-locale-choice='en']", "languageEnglish"],
    ["[data-locale-choice='pt-BR']", "languagePortugueseBrazil"],
    ["[data-l10n-key='progressChooseFolder']", "progressChooseFolder"],
    ["[data-l10n-key='progressChooseFolderDescription']", "progressChooseFolderDescription"],
    ["[data-l10n-key='progressReviewMapping']", "progressReviewMapping"],
    ["[data-l10n-key='progressReviewMappingDescription']", "progressReviewMappingDescription"],
    ["[data-l10n-key='progressConfirmCopy']", "progressConfirmCopy"],
    ["[data-l10n-key='progressConfirmCopyDescription']", "progressConfirmCopyDescription"],
    ["[data-selected-folder-area] .eyebrow", "selectedFolder"],
    ["#folder-title", "chooseTitle"],
    ["[data-workflow-region='choose-folder'] .step-intro p:not(.eyebrow)", "chooseBody"],
    ["[data-select-folder-label]", "selectFolder"],
    ["[data-l10n-key='folderSurfaceBody']", "folderSurfaceBody"],
    ["[data-action='select-folder'][data-l10n-key='scanFolder']", "scanFolder"],
    ["[data-l10n-key='videoFiles']", "videoFiles"],
    ["[data-l10n-key='subtitleFiles']", "subtitleFiles"],
    ["[data-l10n-key='folderHint']", "folderHint"],
    ["[data-l10n-key='supportedExtensions']", "supportedExtensions"],
    [".status-line strong", "statusLabel"],
    ["#planned-title", "plannedCopies"],
    ["[data-planned-area] .eyebrow", "plan"],
    ["[data-l10n-key='sourceSubtitle']", "sourceSubtitle"],
    ["[data-l10n-key='targetSubtitle']", "targetSubtitle"],
    ["[data-l10n-key='targetOrReason']", "targetOrReason"],
    ["[data-l10n-key='statusColumn']", "statusColumn"],
    ["[data-l10n-key='skipReasonColumn']", "skipReasonColumn"],
    ["#skipped-title", "skippedFiles"],
    ["[data-skipped-area] .eyebrow", "skipped"],
    ["[data-empty-state] > .eyebrow", "noPlanLoaded"],
    ["#review-title", "reviewTitle"],
    ["[data-l10n-key='readyCountLabel']", "readyCountLabel"],
    ["[data-l10n-key='skippedCountLabel']", "skippedCountLabel"],
    ["#confirm-title", "copyPlannedSubtitles"],
    ["[data-confirmation] .eyebrow", "confirm"],
    ["[data-confirmation] .step-intro p[data-l10n-key='confirmBody']", "confirmBody"],
    ["[data-l10n-key='copyNotMoveTitle']", "copyNotMoveTitle"],
    ["[data-l10n-key='copyNotMoveBody']", "copyNotMoveBody"],
    ["[data-l10n-key='safeDefaultTitle']", "safeDefaultTitle"],
    ["[data-l10n-key='safeDefaultBody']", "safeDefaultBody"],
    ["[data-action='confirm-copy']", "yesCopy"],
    ["[data-action='cancel-copy']", "startOver"],
    ["[data-outcome-group='completed'] .eyebrow", "completed"],
    ["#completed-title", "copiedFiles"],
    ["[data-outcome-group='failed'] .eyebrow", "failed"],
    ["#failed-title", "failedFile"],
    ["[data-outcome-group='pending'] .eyebrow", "pending"],
    ["#pending-title", "pendingAfterFailure"],
    ["[data-action='rescan']", "rescan"],
    ["[data-action='review-plan']", "reviewCurrentPlan"],
    ["[data-action='back']", "back"],
    ["[data-action='start-over']", "startOver"],
    ["[data-action='copy']", "continue"],
  ]);

  const staticAriaLabelBindings = Object.freeze([
    ["[data-l10n-aria-label='theme']", "theme"],
    ["[data-l10n-aria-label='language']", "language"],
    ["[data-l10n-aria-label='progressLabel']", "progressLabel"],
    ["[data-l10n-aria-label='statusRegionLabel']", "statusRegionLabel"],
    ["[data-l10n-aria-label='supportedFilesLabel']", "supportedFilesLabel"],
    ["[data-l10n-aria-label='planCountsLabel']", "planCountsLabel"],
    ["[data-l10n-aria-label='mapsToLabel']", "mapsToLabel"],
    ["[data-l10n-aria-label='copyReviewLabel']", "copyReviewLabel"],
    ["[data-l10n-aria-label='confirmCopyLabel']", "confirmCopyLabel"],
    ["[data-l10n-aria-label='outcomesLabel']", "outcomesLabel"],
    ["[data-l10n-aria-label='actionsLabel']", "actionsLabel"],
    ["[data-l10n-aria-label='hostileProbeLabel']", "hostileProbeLabel"],
  ]);

  const state = {
    phase: phases.IDLE,
    visibleStep: visibleSteps.CHOOSE,
    requestGeneration: 0,
    selectedDirectoryLabel: "",
    currentPlan: null,
    currentSnapshot: null,
    currentOutcome: null,
    executingPlanId: null,
    locale: locales.EN,
    localePreference: null,
    themePreference: themes.SYSTEM,
    theme: themes.LIGHT,
    systemTheme: themes.LIGHT,
    status: { key: "statusWaiting", vars: {}, isAlert: false },
    emptyState: { titleKey: "emptyReadyTitle", bodyKey: "emptyReadyBody" },
    systemThemeQuery: null,
    openSubmenuButton: null,
  };

  let ui;

  function currentCatalog() {
    return catalogs[state.locale] ?? catalogs.en;
  }

  function text(key) {
    return currentCatalog().text[key] ?? catalogs.en.text[key] ?? key;
  }

  function pluralRuleFor(locale) {
    if (!pluralRules.has(locale)) {
      pluralRules.set(locale, new Intl.PluralRules(locale));
    }
    return pluralRules.get(locale);
  }

  function numericCount(value) {
    return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
  }

  function pluralText(key, value) {
    const count = numericCount(value);
    const forms = currentCatalog().plurals[key] ?? catalogs.en.plurals[key];
    const category = pluralRuleFor(state.locale).select(count);
    return (forms[category] ?? forms.other).replaceAll("{count}", String(count));
  }

  function sameKeys(left, right) {
    const leftKeys = Object.keys(left).sort();
    const rightKeys = Object.keys(right).sort();
    return leftKeys.length === rightKeys.length && leftKeys.every((key, index) => key === rightKeys[index]);
  }

  function validateCatalogs() {
    const base = catalogs.en;
    for (const [locale, catalog] of Object.entries(catalogs)) {
      if (!sameKeys(base.text, catalog.text) || !sameKeys(base.skipLabels, catalog.skipLabels) || !sameKeys(base.errorLabels, catalog.errorLabels) || !sameKeys(base.plurals, catalog.plurals)) {
        throw new Error(`Invalid locale catalog: ${locale}`);
      }
      for (const [key, forms] of Object.entries(catalog.plurals)) {
        if (typeof forms.other !== "string" || !forms.other.includes("{count}")) {
          throw new Error(`Invalid plural catalog entry: ${locale}.${key}`);
        }
      }
      pluralRuleFor(locale);
    }
  }

  function validateLocale(value) {
    if (typeof value !== "string") {
      return null;
    }
    if (value === locales.EN) {
      return locales.EN;
    }
    return value.toLowerCase() === locales.PT_BR.toLowerCase() ? locales.PT_BR : null;
  }

  function validateTheme(value) {
    return value === themes.SYSTEM || value === themes.LIGHT || value === themes.DARK ? value : null;
  }

  function readStorage(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function writeStorage(key, value) {
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }

  function removeStorage(key) {
    try {
      window.localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }

  function systemLocale() {
    const languages = Array.isArray(navigator.languages) ? navigator.languages : [];
    for (const language of languages) {
      if (validateLocale(language) === locales.PT_BR) {
        return locales.PT_BR;
      }
    }
    return locales.EN;
  }

  function systemThemeQuery() {
    if (typeof window.matchMedia !== "function") {
      return null;
    }
    try {
      return window.matchMedia("(prefers-color-scheme: dark)");
    } catch {
      return null;
    }
  }

  function resolvedTheme() {
    if (state.themePreference === themes.DARK || state.themePreference === themes.LIGHT) {
      return state.themePreference;
    }
    return state.systemTheme;
  }

  function applyTheme() {
    state.theme = resolvedTheme();
    document.documentElement.dataset.themePreference = state.themePreference;
    document.documentElement.dataset.theme = state.theme;
    document.documentElement.style.colorScheme = state.theme;
  }

  function applyStaticText() {
    document.title = text("metaTitle");
    const description = document.querySelector("meta[name='description']");
    if (description) {
      description.setAttribute("content", text("metaDescription"));
    }
    for (const [selector, key] of staticTextBindings) {
      for (const element of document.querySelectorAll(selector)) {
        setPlainText(element, text(key));
      }
    }
    for (const [selector, key] of staticAriaLabelBindings) {
      for (const element of document.querySelectorAll(selector)) {
        element.setAttribute("aria-label", text(key));
      }
    }
  }

  function rerenderLocaleText() {
    document.documentElement.lang = state.locale;
    if (!ui) {
      document.title = text("metaTitle");
      return;
    }
    applyStaticText();
    if (!state.selectedDirectoryLabel) {
      setFolderLabels(text("noFolderSelected"));
    }
    renderEmptyState(state.emptyState.titleKey, state.emptyState.bodyKey);
    renderStatus();
  }

  function applyLocale(locale) {
    state.locale = locale;
    rerenderLocaleText();
    if (ui) {
      renderVisibleStep();
    }
  }

  function setLocalePreference(value) {
    const locale = validateLocale(value);
    if (!locale) {
      return false;
    }
    state.localePreference = locale;
    writeStorage(preferenceStorageKeys.locale, locale);
    applyLocale(locale);
    return true;
  }

  function clearLocalePreference() {
    state.localePreference = null;
    removeStorage(preferenceStorageKeys.locale);
    applyLocale(systemLocale());
    return true;
  }

  function setThemePreference(value) {
    const theme = validateTheme(value);
    if (!theme) {
      return false;
    }
    state.themePreference = theme;
    writeStorage(preferenceStorageKeys.theme, theme);
    applyTheme();
    if (ui) {
      updatePreferenceChecks();
    }
    return true;
  }

  function clearThemePreference() {
    state.themePreference = themes.SYSTEM;
    removeStorage(preferenceStorageKeys.theme);
    applyTheme();
    if (ui) {
      updatePreferenceChecks();
    }
    return true;
  }

  function getPreferences() {
    return {
      locale: state.locale,
      localePreference: state.localePreference,
      theme: state.theme,
      themePreference: state.themePreference,
    };
  }

  function initializePreferences() {
    const storedLocale = validateLocale(readStorage(preferenceStorageKeys.locale));
    const storedTheme = validateTheme(readStorage(preferenceStorageKeys.theme));
    if (!storedLocale && readStorage(preferenceStorageKeys.locale) !== null) {
      removeStorage(preferenceStorageKeys.locale);
    }
    if (!storedTheme && readStorage(preferenceStorageKeys.theme) !== null) {
      removeStorage(preferenceStorageKeys.theme);
    }
    state.localePreference = storedLocale;
    state.locale = storedLocale ?? systemLocale();
    state.themePreference = storedTheme ?? themes.SYSTEM;
    state.systemThemeQuery = systemThemeQuery();
    state.systemTheme = state.systemThemeQuery?.matches ? themes.DARK : themes.LIGHT;
    applyLocale(state.locale);
    applyTheme();
    if (state.systemThemeQuery) {
      const updateSystemTheme = (event) => {
        if (typeof event?.matches === "boolean") {
          state.systemTheme = event.matches ? themes.DARK : themes.LIGHT;
        } else {
          state.systemTheme = state.systemThemeQuery?.matches ? themes.DARK : themes.LIGHT;
        }
        if (state.themePreference === themes.SYSTEM) {
          applyTheme();
        }
      };
      if (typeof state.systemThemeQuery.addEventListener === "function") {
        state.systemThemeQuery.addEventListener("change", updateSystemTheme);
      } else if (typeof state.systemThemeQuery.addListener === "function") {
        state.systemThemeQuery.addListener(updateSystemTheme);
      }
    }
    window.addEventListener("languagechange", () => {
      if (!state.localePreference) {
        applyLocale(systemLocale());
      }
    });
  }

  function requiredElement(selector) {
    const element = document.querySelector(selector);
    if (!element) {
      throw new Error(`Missing required shell element: ${selector}`);
    }
    return element;
  }

  function collectUi() {
    ui = {
      shell: requiredElement(selectors.shell),
      status: requiredElement(selectors.status),
      folder: requiredElement(selectors.folder),
      folderLabels: Array.from(document.querySelectorAll(selectors.folderLabels)),
      reviewFolder: requiredElement(selectors.reviewFolder),
      hostile: requiredElement(selectors.hostile),
      emptyState: requiredElement(selectors.emptyState),
      plannedArea: requiredElement(selectors.plannedArea),
      plannedCount: requiredElement(selectors.plannedCount),
      plannedList: requiredElement(selectors.plannedList),
      skippedArea: requiredElement(selectors.skippedArea),
      skippedCount: requiredElement(selectors.skippedCount),
      skippedList: requiredElement(selectors.skippedList),
      confirmation: requiredElement(selectors.confirmation),
      confirmationCount: requiredElement(selectors.confirmationCount),
      confirmationList: requiredElement(selectors.confirmationList),
      outcomes: requiredElement(selectors.outcomes),
      completedGroup: requiredElement(selectors.completedGroup),
      completedList: requiredElement(selectors.completedList),
      failedGroup: requiredElement(selectors.failedGroup),
      failedList: requiredElement(selectors.failedList),
      pendingGroup: requiredElement(selectors.pendingGroup),
      pendingList: requiredElement(selectors.pendingList),
      selectButton: requiredElement(selectors.selectButton),
      selectButtons: Array.from(document.querySelectorAll(selectors.selectButtons)),
      rescanButton: requiredElement(selectors.rescanButton),
      reviewButton: requiredElement(selectors.reviewButton),
      backButton: requiredElement(selectors.backButton),
      startOverButton: requiredElement(selectors.startOverButton),
      copyButton: requiredElement(selectors.copyButton),
      confirmButton: requiredElement(selectors.confirmButton),
      cancelButton: requiredElement(selectors.cancelButton),
      progressSteps: Array.from(document.querySelectorAll(selectors.progressSteps)),
      settingsButton: requiredElement(selectors.settingsButton),
      settingsMenu: requiredElement(selectors.settingsMenu),
      themeChoices: Array.from(document.querySelectorAll(selectors.themeChoices)),
      localeChoices: Array.from(document.querySelectorAll(selectors.localeChoices)),
    };
  }

  function assertStaticSurface() {
    requiredElement(selectors.shell);
    requiredElement("main");
    requiredElement("header[role='banner']");
    requiredElement("footer[data-l10n-aria-label='actionsLabel']");
    requiredElement("[data-selected-folder-area]");
    requiredElement(selectors.plannedArea);
    requiredElement(selectors.skippedArea);
    requiredElement(selectors.confirmation);
    requiredElement(selectors.outcomes);

    const headings = document.querySelectorAll("h1");
    if (headings.length !== 1) {
      throw new Error(`Expected one H1, found ${headings.length}`);
    }

    const status = requiredElement(selectors.status);
    if (status.getAttribute("aria-live") !== "polite") {
      throw new Error("Status region must be aria-live='polite'");
    }

    for (const button of document.querySelectorAll(selectors.buttons)) {
      if (!(button instanceof HTMLButtonElement)) {
        throw new Error("Actions must use native buttons");
      }
    }

    return true;
  }

  function invokeCommand(command, payload) {
    const invoke = window.__TAURI__?.core?.invoke;
    if (typeof invoke !== "function") {
      const error = new Error("The desktop command bridge is unavailable.");
      error.code = "unavailable";
      throw error;
    }
    return payload === undefined ? invoke(command) : invoke(command, payload);
  }

  function nextFrame() {
    return new Promise((resolve) => requestAnimationFrame(resolve));
  }

  function setPlainText(element, value) {
    element.textContent = String(value ?? "");
  }

  function setFolderLabels(value) {
    for (const label of ui.folderLabels) {
      setPlainText(label, value);
    }
  }

  function renderStatus() {
    let message;
    if (state.status.key === "statusPlanReady") {
      message = pluralText(state.status.key, state.status.vars.count);
    } else if (state.status.key === "statusPartialFailure") {
      message = `${pluralText("copiedFiles", state.status.vars.count)}; ${text("statusPartialFailureTail")}`;
    } else if (state.status.key === "statusCompleted") {
      message = `${pluralText("copiedFiles", state.status.vars.count)}. ${text("statusCompletedTail")}`;
    } else if (state.status.key === "error") {
      message = errorLabel(state.status.vars.code);
    } else {
      message = text(state.status.key);
    }
    setPlainText(ui.status, message);
    ui.status.setAttribute("aria-live", state.status.isAlert ? "assertive" : "polite");
    if (state.status.isAlert) {
      ui.status.setAttribute("role", "alert");
    } else {
      ui.status.removeAttribute("role");
    }
  }

  function setStatus(messageKey, vars = {}, isAlert = false) {
    state.status = { key: messageKey, vars, isAlert };
    renderStatus();
  }

  function setHidden(element, hidden) {
    element.hidden = hidden;
  }

  function setButtons(disabled) {
    for (const button of ui.selectButtons) {
      button.disabled = disabled.select;
    }
    ui.rescanButton.disabled = disabled.rescan;
    ui.reviewButton.disabled = disabled.review;
    ui.backButton.disabled = disabled.back;
    ui.startOverButton.disabled = disabled.startOver;
    ui.copyButton.disabled = disabled.copy;
    ui.confirmButton.disabled = disabled.confirm;
    ui.cancelButton.disabled = disabled.cancel;
  }

  function clearList(list) {
    list.replaceChildren();
  }

  function clearDynamicContent() {
    clearList(ui.plannedList);
    clearList(ui.skippedList);
    clearList(ui.completedList);
    clearList(ui.failedList);
    clearList(ui.pendingList);
    clearList(ui.confirmationList);
    setPlainText(ui.plannedCount, "0");
    setPlainText(ui.skippedCount, "0");
    setPlainText(ui.confirmationCount, "");
  }

  function safeCode(value) {
    return String(value ?? "").trim();
  }

  function humanSkipReason(code) {
    const key = safeCode(code);
    return currentCatalog().skipLabels[key] ?? text("skippedFallback");
  }

  function errorLabel(code) {
    return currentCatalog().errorLabels[safeCode(code)] ?? text("operationFailed");
  }

  function humanError(error) {
    const code = safeCode(error?.code ?? error?.errorCode ?? error?.kind);
    return errorLabel(code);
  }

  function normalizeRows(rows) {
    return Array.isArray(rows) ? rows : [];
  }

  function appendCopyContents(item, row) {
    const source = document.createElement("bdi");
    const arrow = document.createElement("span");
    const target = document.createElement("bdi");

    setPlainText(source, row?.sourceLabel ?? text("unknownSubtitle"));
    setPlainText(arrow, " -> ");
    setPlainText(target, row?.targetLabel ?? text("unknownTarget"));

    item.append(source, arrow, target);
  }

  function appendCopyRow(list, row) {
    const item = document.createElement("li");
    appendCopyContents(item, row);
    list.append(item);
  }

  function appendReadyCopyRow(list, row) {
    const item = document.createElement("tr");
    appendBdiCell(item, row?.sourceLabel ?? text("unknownSubtitle"));
    appendArrowCell(item);
    appendBdiCell(item, row?.targetLabel ?? text("unknownTarget"));
    appendStatusCell(item, text("readyForCopy"), "success");
    list.append(item);
  }

  function appendConfirmationRow(list, row) {
    const item = document.createElement("li");
    const target = document.createElement("bdi");
    setPlainText(target, row?.targetLabel ?? text("unknownTarget"));
    item.append(target);
    list.append(item);
  }

  function appendSkipRow(list, row) {
    const item = document.createElement("tr");
    appendBdiCell(item, row?.sourceLabel ?? row?.label ?? text("unknownSubtitle"));
    appendArrowCell(item);
    appendBdiCell(item, humanSkipReason(row?.reasonCode ?? row?.reason));
    appendStatusCell(item, text("skippedFallback"), "warning");
    list.append(item);
  }

  function appendArrowCell(row) {
    const cell = document.createElement("td");
    cell.className = "mapping-table__arrow-cell";
    cell.setAttribute("aria-hidden", "true");
    setPlainText(cell, "→");
    row.append(cell);
  }

  function appendBdiCell(row, value) {
    const cell = document.createElement("td");
    const textValue = document.createElement("bdi");
    setPlainText(textValue, value);
    cell.append(textValue);
    row.append(cell);
  }

  function appendStatusCell(row, label, tone) {
    const cell = document.createElement("td");
    const status = document.createElement("span");
    status.className = `status-pill status-pill--${tone}`;
    status.dataset.statusPill = tone;
    setPlainText(status, label);
    cell.append(status);
    row.append(cell);
  }

  function appendFailedRow(list, row) {
    const item = document.createElement("li");
    appendCopyContents(item, row);
    const detail = document.createElement("p");
    const warning = row?.partialTargetMayRemain ? ` ${text("partialTargetMayRemain")}` : "";
    setPlainText(detail, `${humanError(row)}${warning}`);
    item.append(detail);
    list.append(item);
  }

  function renderEmptyState(titleKey, bodyKey) {
    state.emptyState = { titleKey, bodyKey };
    const titleElement = ui.emptyState.querySelector("h2");
    const bodyElement = ui.emptyState.querySelector("p:not(.eyebrow):not(.probe-output)");
    if (titleElement) {
      setPlainText(titleElement, text(titleKey));
    }
    if (bodyElement) {
      setPlainText(bodyElement, text(bodyKey));
    }
  }

  function hideReviewAndOutcomes() {
    setHidden(ui.plannedArea, true);
    setHidden(ui.skippedArea, true);
    setHidden(ui.confirmation, true);
    setHidden(ui.outcomes, true);
    setHidden(ui.completedGroup, true);
    setHidden(ui.failedGroup, true);
    setHidden(ui.pendingGroup, true);
  }

  function stepForPhase(phase) {
    if (phase === phases.PLAN_READY || phase === phases.PLAN_EMPTY) {
      return visibleSteps.REVIEW;
    }
    if (phase === phases.CONFIRMING || phase === phases.EXECUTING || phase === phases.COMPLETED || phase === phases.PARTIAL_FAILURE || phase === phases.EXECUTION_FAILURE) {
      return visibleSteps.CONFIRM;
    }
    return visibleSteps.CHOOSE;
  }

  function phaseForStepCss() {
    if (state.visibleStep === visibleSteps.REVIEW) {
      return phases.PLAN_READY;
    }
    if (state.visibleStep === visibleSteps.CONFIRM) {
      return state.phase === phases.EXECUTING || state.phase === phases.COMPLETED || state.phase === phases.PARTIAL_FAILURE || state.phase === phases.EXECUTION_FAILURE ? state.phase : phases.CONFIRMING;
    }
    return stepForPhase(state.phase) === visibleSteps.CHOOSE ? state.phase : phases.IDLE;
  }

  function updateProgress() {
    ui.shell.dataset.phase = phaseForStepCss();
    ui.shell.dataset.visibleStep = state.visibleStep;
    for (const step of ui.progressSteps) {
      if (step.dataset.progressStep === state.visibleStep) {
        step.setAttribute("aria-current", "step");
      } else {
        step.removeAttribute("aria-current");
      }
    }
  }

  function snapshotCopies() {
    return normalizeRows(state.currentSnapshot?.copies);
  }

  function snapshotSkips() {
    return normalizeRows(state.currentSnapshot?.skips);
  }

  function updatePreferenceChecks() {
    for (const item of ui.themeChoices) {
      item.setAttribute("aria-checked", item.dataset.themeChoice === state.themePreference ? "true" : "false");
    }
    for (const item of ui.localeChoices) {
      item.setAttribute("aria-checked", item.dataset.localeChoice === state.locale ? "true" : "false");
    }
  }

  function updateActionLabels() {
    if (state.visibleStep === visibleSteps.REVIEW) {
      setPlainText(ui.copyButton, text("continue"));
      return;
    }
    if (state.visibleStep === visibleSteps.CONFIRM && state.currentPlan?.canExecute) {
      setPlainText(ui.copyButton, pluralText("copyButtonSubtitles", snapshotCopies().length));
      return;
    }
    setPlainText(ui.copyButton, text("copySubtitles"));
  }

  function updateControls() {
    const busy = state.phase === phases.SELECTING || state.phase === phases.SCANNING || state.phase === phases.EXECUTING;
    const hasDirectory = state.selectedDirectoryLabel.length > 0;
    const hasPlan = Boolean(state.currentPlan?.planId);
    const canExecute = Boolean(state.currentPlan?.planId && state.currentPlan.canExecute);
    const hasOutcome = Boolean(state.currentOutcome);
    ui.shell.dataset.hasPlan = String(hasPlan);
    setButtons({
      select: busy,
      rescan: busy || !hasDirectory,
      review: busy || !hasPlan || state.visibleStep === visibleSteps.REVIEW,
      back: busy || state.visibleStep === visibleSteps.CHOOSE || hasOutcome,
      startOver: busy || (!hasPlan && !hasOutcome),
      copy: busy || hasOutcome || (state.visibleStep !== visibleSteps.REVIEW && state.visibleStep !== visibleSteps.CONFIRM) || !canExecute,
      confirm: busy || state.visibleStep !== visibleSteps.CONFIRM || hasOutcome || !canExecute,
      cancel: busy || (!hasPlan && !hasOutcome),
    });
    updateActionLabels();
  }

  function renderReviewStep() {
    const copies = snapshotCopies();
    const skips = snapshotSkips();
    const rowCount = copies.length + skips.length;
    clearDynamicContent();
    for (const row of copies) {
      appendReadyCopyRow(ui.plannedList, row);
    }
    for (const row of skips) {
      appendSkipRow(ui.skippedList, row);
    }
    setPlainText(ui.plannedCount, copies.length);
    setPlainText(ui.skippedCount, skips.length);
    setHidden(ui.plannedArea, rowCount === 0);
    setHidden(ui.skippedArea, true);
    setHidden(ui.confirmation, true);
    setHidden(ui.outcomes, true);
    setHidden(ui.emptyState, rowCount > 0);
    if (rowCount === 0) {
      renderEmptyState("emptyNoFilesTitle", "emptyNoFilesBody");
    }
  }

  function renderConfirmationStep() {
    clearDynamicContent();
    hideReviewAndOutcomes();
    setHidden(ui.emptyState, state.phase !== phases.EXECUTION_FAILURE);
    if (state.phase === phases.EXECUTION_FAILURE) {
      return;
    }
    if (state.currentOutcome) {
      renderOutcomeLists();
      return;
    }
    const copies = snapshotCopies();
    setPlainText(ui.confirmationCount, pluralText("confirmCopyCount", copies.length));
    for (const row of copies) {
      appendConfirmationRow(ui.confirmationList, row);
    }
    setHidden(ui.confirmation, false);
  }

  function renderChooseStep() {
    hideReviewAndOutcomes();
    setHidden(ui.emptyState, false);
  }

  function renderVisibleStep() {
    updateProgress();
    updatePreferenceChecks();
    if (state.visibleStep === visibleSteps.REVIEW) {
      renderReviewStep();
    } else if (state.visibleStep === visibleSteps.CONFIRM) {
      renderConfirmationStep();
    } else {
      renderChooseStep();
    }
    updateControls();
  }

  function setVisibleStep(step) {
    state.visibleStep = step;
    renderVisibleStep();
  }

  function renderSnapshot(snapshot) {
    const copies = normalizeRows(snapshot?.copies);
    const skips = normalizeRows(snapshot?.skips);
    state.currentPlan = {
      planId: String(snapshot?.planId ?? ""),
      canExecute: Boolean(snapshot?.canExecute) && copies.length > 0,
    };
    state.currentSnapshot = {
      planId: state.currentPlan.planId,
      directoryLabel: String(snapshot?.directoryLabel ?? "Selected folder"),
      canExecute: state.currentPlan.canExecute,
      copies,
      skips,
    };
    state.currentOutcome = null;
    state.selectedDirectoryLabel = String(snapshot?.directoryLabel ?? "Selected folder");

    setFolderLabels(state.selectedDirectoryLabel);
    state.visibleStep = visibleSteps.REVIEW;

    if (state.currentPlan.canExecute) {
      setPhase(phases.PLAN_READY, "statusPlanReady", { count: copies.length });
    } else {
      renderEmptyState("emptyNoFilesTitle", "emptyNoFilesBody");
      setPhase(phases.PLAN_EMPTY, "statusNoFilesToCopy");
    }
  }

  function renderOutcomeLists() {
    const completed = normalizeRows(state.currentOutcome?.completed);
    const failed = Array.isArray(state.currentOutcome?.failed) ? state.currentOutcome.failed : state.currentOutcome?.failed ? [state.currentOutcome.failed] : [];
    const pending = normalizeRows(state.currentOutcome?.pending);
    for (const row of completed) {
      appendCopyRow(ui.completedList, row);
    }
    for (const row of failed) {
      appendFailedRow(ui.failedList, row);
    }
    for (const row of pending) {
      appendCopyRow(ui.pendingList, row);
    }

    setHidden(ui.outcomes, false);
    setHidden(ui.completedGroup, completed.length === 0);
    setHidden(ui.failedGroup, failed.length === 0);
    setHidden(ui.pendingGroup, pending.length === 0);
  }

  function renderOutcome(result) {
    const completed = normalizeRows(result?.completed);
    const failed = Array.isArray(result?.failed) ? result.failed : result?.failed ? [result.failed] : [];
    const pending = normalizeRows(result?.pending);
    state.currentOutcome = { completed, failed, pending };
    state.currentPlan = null;
    state.currentSnapshot = null;
    state.visibleStep = visibleSteps.CONFIRM;

    if (failed.length > 0 || pending.length > 0) {
      setPhase(phases.PARTIAL_FAILURE, "statusPartialFailure", { count: completed.length }, true);
      return;
    }

    setPhase(phases.COMPLETED, "statusCompleted", { count: completed.length });
  }

  function restoreAfterCancelledSelection(previousStep) {
    setHidden(ui.confirmation, true);
    setHidden(ui.outcomes, true);

    if (state.currentPlan?.planId) {
      state.visibleStep = previousStep;
      const message = state.currentPlan.canExecute
        ? "statusSelectionCanceledPreviousPlan"
        : "statusSelectionCanceledNoFiles";
      enterPhase(state.currentPlan.canExecute ? phases.PLAN_READY : phases.PLAN_EMPTY, message);
      return;
    }

    if (!state.selectedDirectoryLabel) {
      setFolderLabels(text("noFolderSelected"));
      hideReviewAndOutcomes();
      clearDynamicContent();
      setHidden(ui.emptyState, false);
      renderEmptyState("emptyReadyTitle", "emptyReadyBody");
    }

    state.visibleStep = visibleSteps.CHOOSE;
    enterPhase(phases.IDLE, "statusSelectionCanceled");
  }

  function setPhase(phase, messageKey, vars = {}, isAlert = false) {
    state.phase = phase;
    ui.shell.setAttribute("aria-busy", phase === phases.SELECTING || phase === phases.SCANNING || phase === phases.EXECUTING ? "true" : "false");
    setStatus(messageKey, vars, isAlert);
    renderVisibleStep();
  }

  function focusElement(element) {
    if (!element.disabled && !element.hidden && !element.closest("[hidden]")) {
      element.focus();
    }
  }

  function focusForPhase(phase) {
    if (phase === phases.PLAN_READY || phase === phases.PLAN_EMPTY) {
      focusElement(state.currentPlan?.canExecute ? ui.copyButton : ui.rescanButton);
    } else if (phase === phases.COMPLETED || phase === phases.PARTIAL_FAILURE || phase === phases.EXECUTION_FAILURE) {
      focusElement(ui.startOverButton.disabled ? ui.selectButton : ui.startOverButton);
    } else if (phase === phases.CONFIRMING) {
      focusElement(ui.copyButton);
    } else if (phase === phases.PLANNING_FAILURE) {
      focusElement(ui.selectButton);
    }
  }

  function enterPhase(phase, messageKey, vars = {}, isAlert = false) {
    setPhase(phase, messageKey, vars, isAlert);
    focusForPhase(phase);
  }

  async function beginPlanning(command) {
    const generation = ++state.requestGeneration;
    const selecting = command === "select_and_plan";
    const previousStep = state.visibleStep;
    setHidden(ui.confirmation, true);
    setHidden(ui.outcomes, true);
    if (!selecting) {
      hideReviewAndOutcomes();
      clearDynamicContent();
      state.currentPlan = null;
      state.currentSnapshot = null;
      state.currentOutcome = null;
    }
    state.visibleStep = visibleSteps.CHOOSE;
    renderEmptyState(command === "select_and_plan" ? "emptyOpeningFolderTitle" : "emptyScanningTitle", "emptyPlanningBody");
    enterPhase(command === "select_and_plan" ? phases.SELECTING : phases.SCANNING, command === "select_and_plan" ? "statusOpeningFolder" : "statusScanning");

    if (selecting) {
      await nextFrame();
      if (generation !== state.requestGeneration) {
        return;
      }
      setPhase(phases.SCANNING, "statusScanning");
    }

    try {
      const snapshot = await invokeCommand(command);
      if (generation !== state.requestGeneration) {
        return;
      }
      if (selecting && snapshot === null) {
        restoreAfterCancelledSelection(previousStep);
        return;
      }
      renderSnapshot(snapshot);
      focusForPhase(state.phase);
    } catch (error) {
      if (generation !== state.requestGeneration) {
        return;
      }
      state.currentPlan = null;
      state.currentSnapshot = null;
      state.currentOutcome = null;
      state.visibleStep = visibleSteps.CHOOSE;
      hideReviewAndOutcomes();
      setHidden(ui.emptyState, false);
      renderEmptyState("emptyPlanningFailedTitle", "emptyPlanningFailedBody");
      enterPhase(phases.PLANNING_FAILURE, "error", { code: error?.code ?? error?.errorCode ?? error?.kind }, true);
    }
  }

  function beginConfirmation() {
    if (!state.currentPlan?.canExecute) {
      return;
    }
    state.visibleStep = visibleSteps.CONFIRM;
    enterPhase(phases.CONFIRMING, "statusConfirming");
  }

  async function discardCurrentPlan() {
    const planId = state.currentPlan?.planId;
    if (!planId) {
      state.currentOutcome = null;
      state.visibleStep = visibleSteps.CHOOSE;
      hideReviewAndOutcomes();
      clearDynamicContent();
      renderEmptyState("emptyReadyTitle", "emptyReadyBody");
      enterPhase(phases.IDLE, "statusWaiting");
      return;
    }
    const generation = ++state.requestGeneration;
    setPhase(phases.EXECUTING, "statusDiscarding");
    try {
      await invokeCommand("discard_plan", { planId });
    } catch (error) {
      if (generation !== state.requestGeneration) {
        return;
      }
      state.currentPlan = null;
      state.currentSnapshot = null;
      state.currentOutcome = null;
      state.visibleStep = visibleSteps.CHOOSE;
      hideReviewAndOutcomes();
      clearDynamicContent();
      setHidden(ui.emptyState, false);
      renderEmptyState("emptyDiscardedLocalTitle", "emptyDiscardedLocalBody");
      enterPhase(phases.DECLINED, "error", { code: error?.code ?? error?.errorCode ?? error?.kind }, true);
      return;
    }
    if (generation !== state.requestGeneration) {
      return;
    }
    state.currentPlan = null;
    state.currentSnapshot = null;
    state.currentOutcome = null;
    state.visibleStep = visibleSteps.CHOOSE;
    hideReviewAndOutcomes();
    clearDynamicContent();
    setHidden(ui.emptyState, false);
    renderEmptyState("emptyReadyTitle", "emptyReadyBody");
    enterPhase(phases.IDLE, "statusDeclined");
  }

  async function executeCurrentPlan() {
    const planId = state.currentPlan?.planId;
    if (!planId || state.phase === phases.EXECUTING || state.executingPlanId === planId) {
      return;
    }
    state.executingPlanId = planId;
    const generation = ++state.requestGeneration;
    setHidden(ui.confirmation, true);
    state.visibleStep = visibleSteps.CONFIRM;
    setPhase(phases.EXECUTING, "statusCopying");
    try {
      const result = await invokeCommand("execute_plan", { planId });
      if (generation !== state.requestGeneration) {
        return;
      }
      state.executingPlanId = null;
      renderOutcome(result);
      focusForPhase(state.phase);
      await nextFrame();
      if (generation === state.requestGeneration) {
        focusForPhase(state.phase);
      }
    } catch (error) {
      if (generation !== state.requestGeneration) {
        return;
      }
      state.executingPlanId = null;
      hideReviewAndOutcomes();
      clearDynamicContent();
      setHidden(ui.emptyState, false);
      renderEmptyState("emptyCopyDidNotRunTitle", "emptyCopyDidNotRunBody");
      state.currentPlan = null;
      state.currentSnapshot = null;
      state.currentOutcome = null;
      state.visibleStep = visibleSteps.CONFIRM;
      enterPhase(phases.EXECUTION_FAILURE, "error", { code: error?.code ?? error?.errorCode ?? error?.kind }, true);
    }
  }

  function renderHostileProbe(value) {
    setPlainText(ui.hostile, value);
    const output = ui.hostile.closest(".probe-output");
    if (output) {
      output.hidden = String(value).length === 0;
    }
    return ui.hostile.textContent;
  }

  function getSurfaceState() {
    return {
      phase: state.phase,
      visibleStep: state.visibleStep,
      h1Count: document.querySelectorAll("h1").length,
      statusText: ui.status.textContent,
      hostileText: ui.hostile.textContent,
      folderText: ui.folder.textContent,
      activeElement: document.activeElement?.textContent?.trim() ?? "",
      activeAction: document.activeElement?.dataset?.action ?? "",
    };
  }

  function menuItems(menu) {
    return Array.from(menu.querySelectorAll(":scope > li > [role^='menuitem']"));
  }

  function checkedOrFirstItem(menu) {
    return menu.querySelector(":scope > li > [aria-checked='true']") ?? menuItems(menu)[0] ?? null;
  }

  function submenuFor(button) {
    const id = button.getAttribute("aria-controls");
    return id ? document.getElementById(id) : null;
  }

  function focusMenuItem(menu, index) {
    const items = menuItems(menu);
    if (items.length === 0) {
      return;
    }
    items[(index + items.length) % items.length].focus();
  }

  function focusFirstMenuItem(menu) {
    focusMenuItem(menu, 0);
  }

  function focusLastMenuItem(menu) {
    focusMenuItem(menu, menuItems(menu).length - 1);
  }

  function closeSubmenu(restoreFocus = true) {
    if (!state.openSubmenuButton) {
      return;
    }
    const button = state.openSubmenuButton;
    const submenu = submenuFor(button);
    if (submenu) {
      submenu.hidden = true;
    }
    button.setAttribute("aria-expanded", "false");
    state.openSubmenuButton = null;
    if (restoreFocus) {
      button.focus();
    }
  }

  function closeSettingsMenu(restoreFocus = true) {
    closeSubmenu(false);
    ui.settingsMenu.hidden = true;
    ui.settingsButton.setAttribute("aria-expanded", "false");
    if (restoreFocus) {
      focusElement(ui.settingsButton);
    }
  }

  function openSettingsMenu(focusTarget = "first") {
    ui.settingsMenu.hidden = false;
    ui.settingsButton.setAttribute("aria-expanded", "true");
    if (focusTarget === "last") {
      focusLastMenuItem(ui.settingsMenu);
    } else {
      focusFirstMenuItem(ui.settingsMenu);
    }
  }

  function openSubmenu(button) {
    const submenu = submenuFor(button);
    if (!submenu) {
      return;
    }
    if (state.openSubmenuButton && state.openSubmenuButton !== button) {
      closeSubmenu(false);
    }
    submenu.hidden = false;
    button.setAttribute("aria-expanded", "true");
    state.openSubmenuButton = button;
    checkedOrFirstItem(submenu)?.focus();
  }

  function activateMenuItem(item) {
    if (item.matches(selectors.themeChoices)) {
      setThemePreference(item.dataset.themeChoice);
      closeSettingsMenu(true);
      return;
    }
    if (item.matches(selectors.localeChoices)) {
      setLocalePreference(item.dataset.localeChoice);
      closeSettingsMenu(true);
      return;
    }
    if (item.getAttribute("aria-haspopup") === "menu") {
      openSubmenu(item);
    }
  }

  function menuForItem(item) {
    return item.closest("[role='menu']");
  }

  function moveMenuFocus(item, delta) {
    const menu = menuForItem(item);
    const items = menuItems(menu);
    const index = items.indexOf(item);
    focusMenuItem(menu, index + delta);
  }

  function handleMenuButtonKeydown(event) {
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openSettingsMenu("first");
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      openSettingsMenu("last");
    }
  }

  function handleMenuItemKeydown(event) {
    const item = event.target.closest("[role^='menuitem']");
    if (!item) {
      return;
    }
    const menu = menuForItem(item);
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveMenuFocus(item, 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      moveMenuFocus(item, -1);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusFirstMenuItem(menu);
    } else if (event.key === "End") {
      event.preventDefault();
      focusLastMenuItem(menu);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      activateMenuItem(item);
    } else if (event.key === "ArrowRight") {
      if (item.getAttribute("aria-haspopup") === "menu") {
        event.preventDefault();
        openSubmenu(item);
      }
    } else if (event.key === "ArrowLeft") {
      if (menu !== ui.settingsMenu) {
        event.preventDefault();
        closeSubmenu(true);
      }
    } else if (event.key === "Escape") {
      event.preventDefault();
      if (menu !== ui.settingsMenu) {
        closeSubmenu(true);
      } else {
        closeSettingsMenu(true);
      }
    } else if (event.key === "Tab") {
      closeSettingsMenu(false);
    }
  }

  function bindSettingsMenu() {
    ui.settingsButton.addEventListener("click", () => {
      if (ui.settingsMenu.hidden) {
        openSettingsMenu("first");
      } else {
        closeSettingsMenu(true);
      }
    });
    ui.settingsButton.addEventListener("keydown", handleMenuButtonKeydown);
    ui.settingsMenu.addEventListener("keydown", handleMenuItemKeydown);
    ui.settingsMenu.addEventListener("click", (event) => {
      const target = event.target instanceof Element ? event.target : event.target.parentElement;
      const item = target?.closest("[role^='menuitem']");
      if (item) {
        activateMenuItem(item);
      }
    });
    document.addEventListener("pointerdown", (event) => {
      if (!ui.settingsMenu.hidden && !ui.settingsButton.contains(event.target) && !ui.settingsMenu.contains(event.target)) {
        closeSettingsMenu(true);
      }
    });
  }

  function bindEvents() {
    for (const button of ui.selectButtons) {
      button.addEventListener("click", () => {
        void beginPlanning("select_and_plan");
      });
    }
    ui.rescanButton.addEventListener("click", () => {
      void beginPlanning("rescan");
    });
    ui.reviewButton.addEventListener("click", () => {
      if (state.currentPlan?.planId) {
        setVisibleStep(visibleSteps.REVIEW);
        focusElement(ui.copyButton.disabled ? ui.rescanButton : ui.copyButton);
      }
    });
    ui.backButton.addEventListener("click", () => {
      if (state.phase === phases.EXECUTING) {
        return;
      }
      if (state.visibleStep === visibleSteps.REVIEW) {
        renderEmptyState("emptyReadyTitle", "emptyReadyBody");
      }
      setVisibleStep(state.visibleStep === visibleSteps.CONFIRM ? visibleSteps.REVIEW : visibleSteps.CHOOSE);
      focusElement(state.visibleStep === visibleSteps.REVIEW ? ui.copyButton : ui.reviewButton);
    });
    ui.startOverButton.addEventListener("click", () => {
      void discardCurrentPlan();
    });
    ui.copyButton.addEventListener("click", () => {
      if (state.visibleStep === visibleSteps.CONFIRM) {
        void executeCurrentPlan();
        return;
      }
      beginConfirmation();
    });
    ui.cancelButton.addEventListener("click", () => {
      void discardCurrentPlan();
    });
    ui.confirmButton.addEventListener("click", () => {
      void executeCurrentPlan();
    });
    bindSettingsMenu();
  }

  document.addEventListener("DOMContentLoaded", () => {
    validateCatalogs();
    initializePreferences();
    assertStaticSurface();
    collectUi();
    applyStaticText();
    rerenderLocaleText();
    renderHostileProbe("");
    hideReviewAndOutcomes();
    renderEmptyState("emptyReadyTitle", "emptyReadyBody");
    setPhase(phases.IDLE, "statusWaiting");
    bindEvents();
    window.subtitleRenamerShell = Object.freeze({
      assertStaticSurface,
      renderHostileProbe,
      getSurfaceState,
      getPreferences,
      setLocalePreference,
      clearLocalePreference,
      setThemePreference,
      clearThemePreference,
      text,
      pluralText,
    });
  });
})();
