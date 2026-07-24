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
    hostile: "[data-hostile-output]",
    emptyState: "[data-empty-state]",
    plannedArea: "[data-planned-area]",
    plannedCount: "[data-planned-count]",
    plannedList: "[data-planned-list]",
    skippedArea: "[data-skipped-area]",
    skippedCount: "[data-skipped-count]",
    skippedList: "[data-skipped-list]",
    confirmation: "[data-confirmation]",
    outcomes: "[data-outcomes]",
    completedGroup: "[data-outcome-group='completed']",
    completedList: "[data-completed-list]",
    failedGroup: "[data-outcome-group='failed']",
    failedList: "[data-failed-list]",
    pendingGroup: "[data-outcome-group='pending']",
    pendingList: "[data-pending-list]",
    selectButton: "[data-action='select-folder']",
    rescanButton: "[data-action='rescan']",
    copyButton: "[data-action='copy']",
    confirmButton: "[data-action='confirm-copy']",
    cancelButton: "[data-action='cancel-copy']",
    dynamicGroups: "[data-dynamic-group]",
    buttons: "button",
  };

  const skipLabels = Object.freeze({
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
  });

  const errorLabels = Object.freeze({
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
  });

  const state = {
    phase: phases.IDLE,
    requestGeneration: 0,
    selectedDirectoryLabel: "",
    currentPlan: null,
  };

  let ui;

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
      hostile: requiredElement(selectors.hostile),
      emptyState: requiredElement(selectors.emptyState),
      plannedArea: requiredElement(selectors.plannedArea),
      plannedCount: requiredElement(selectors.plannedCount),
      plannedList: requiredElement(selectors.plannedList),
      skippedArea: requiredElement(selectors.skippedArea),
      skippedCount: requiredElement(selectors.skippedCount),
      skippedList: requiredElement(selectors.skippedList),
      confirmation: requiredElement(selectors.confirmation),
      outcomes: requiredElement(selectors.outcomes),
      completedGroup: requiredElement(selectors.completedGroup),
      completedList: requiredElement(selectors.completedList),
      failedGroup: requiredElement(selectors.failedGroup),
      failedList: requiredElement(selectors.failedList),
      pendingGroup: requiredElement(selectors.pendingGroup),
      pendingList: requiredElement(selectors.pendingList),
      selectButton: requiredElement(selectors.selectButton),
      rescanButton: requiredElement(selectors.rescanButton),
      copyButton: requiredElement(selectors.copyButton),
      confirmButton: requiredElement(selectors.confirmButton),
      cancelButton: requiredElement(selectors.cancelButton),
    };
  }

  function assertStaticSurface() {
    requiredElement(selectors.shell);
    requiredElement("main");
    requiredElement("header[role='banner']");
    requiredElement("footer[aria-label='Actions']");
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

  function setStatus(message, isAlert = false) {
    setPlainText(ui.status, message);
    ui.status.setAttribute("aria-live", isAlert ? "assertive" : "polite");
    if (isAlert) {
      ui.status.setAttribute("role", "alert");
    } else {
      ui.status.removeAttribute("role");
    }
  }

  function setHidden(element, hidden) {
    element.hidden = hidden;
  }

  function setButtons(disabled) {
    ui.selectButton.disabled = disabled.select;
    ui.rescanButton.disabled = disabled.rescan;
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
    setPlainText(ui.plannedCount, "0");
    setPlainText(ui.skippedCount, "0");
  }

  function safeCode(value) {
    return String(value ?? "").trim();
  }

  function humanSkipReason(code) {
    const key = safeCode(code);
    return skipLabels[key] ?? (key.replaceAll("_", "-") || "Skipped");
  }

  function humanError(error) {
    const code = safeCode(error?.code ?? error?.errorCode ?? error?.kind);
    const label = errorLabels[code] ?? "Operation failed.";
    const message = errorLabels[code] && typeof error?.safeMessage === "string" ? safeCode(error.safeMessage) : "";
    return message && message !== label ? `${label} ${message}` : label;
  }

  function normalizeRows(rows) {
    return Array.isArray(rows) ? rows : [];
  }

  function appendCopyContents(item, row) {
    const source = document.createElement("bdi");
    const arrow = document.createElement("span");
    const target = document.createElement("bdi");

    setPlainText(source, row?.sourceLabel ?? "Unknown subtitle");
    setPlainText(arrow, " -> ");
    setPlainText(target, row?.targetLabel ?? "Unknown target");

    item.append(source, arrow, target);
  }

  function appendCopyRow(list, row) {
    const item = document.createElement("li");
    appendCopyContents(item, row);
    list.append(item);
  }

  function appendSkipRow(list, row) {
    const item = document.createElement("li");
    const reason = document.createElement("strong");
    const label = document.createElement("bdi");

    setPlainText(reason, `${humanSkipReason(row?.reasonCode ?? row?.reason)}: `);
    setPlainText(label, row?.sourceLabel ?? row?.label ?? "Unknown subtitle");

    item.append(reason, label);
    list.append(item);
  }

  function appendFailedRow(list, row) {
    const item = document.createElement("li");
    appendCopyContents(item, row);
    const detail = document.createElement("p");
    const warning = row?.partialTargetMayRemain ? " Partial target may remain." : "";
    setPlainText(detail, `${humanError(row)}${warning}`);
    item.append(detail);
    list.append(item);
  }

  function renderEmptyState(title, body) {
    const titleElement = ui.emptyState.querySelector("h2");
    const bodyElement = ui.emptyState.querySelector("p:not(.eyebrow):not(.probe-output)");
    if (titleElement) {
      setPlainText(titleElement, title);
    }
    if (bodyElement) {
      setPlainText(bodyElement, body);
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

  function renderSnapshot(snapshot) {
    const copies = normalizeRows(snapshot?.copies);
    const skips = normalizeRows(snapshot?.skips);
    state.currentPlan = {
      planId: String(snapshot?.planId ?? ""),
      canExecute: Boolean(snapshot?.canExecute) && copies.length > 0,
    };
    state.selectedDirectoryLabel = String(snapshot?.directoryLabel ?? "Selected folder");

    setPlainText(ui.folder, state.selectedDirectoryLabel);
    clearDynamicContent();
    for (const row of copies) {
      appendCopyRow(ui.plannedList, row);
    }
    for (const row of skips) {
      appendSkipRow(ui.skippedList, row);
    }
    setPlainText(ui.plannedCount, copies.length);
    setPlainText(ui.skippedCount, skips.length);

    setHidden(ui.plannedArea, !state.currentPlan.canExecute);
    setHidden(ui.skippedArea, skips.length === 0);
    setHidden(ui.confirmation, true);
    setHidden(ui.outcomes, true);
    setHidden(ui.emptyState, state.currentPlan.canExecute || skips.length > 0);

    if (state.currentPlan.canExecute) {
      setPhase(phases.PLAN_READY, `${copies.length} subtitle ${copies.length === 1 ? "copy" : "copies"} ready. Review the plan before confirming.`);
    } else {
      renderEmptyState("No files to copy", "The selected folder has no executable subtitle copies. Source files were not changed.");
      setPhase(phases.PLAN_EMPTY, "No files to copy.");
    }
  }

  function renderOutcome(result) {
    const completed = normalizeRows(result?.completed);
    const failed = Array.isArray(result?.failed) ? result.failed : result?.failed ? [result.failed] : [];
    const pending = normalizeRows(result?.pending);

    clearDynamicContent();
    hideReviewAndOutcomes();

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
    setHidden(ui.emptyState, true);
    state.currentPlan = null;

    if (failed.length > 0 || pending.length > 0) {
      setPhase(phases.PARTIAL_FAILURE, `Copied ${completed.length} file${completed.length === 1 ? "" : "s"}; stopped at the first failure. Pending files were not attempted.`, true);
      return;
    }

    setPhase(phases.COMPLETED, `Copied ${completed.length} file${completed.length === 1 ? "" : "s"}. Source subtitles remain in place and existing targets were not overwritten.`);
  }

  function restoreAfterCancelledSelection() {
    setHidden(ui.confirmation, true);
    setHidden(ui.outcomes, true);

    if (state.currentPlan?.planId) {
      const message = state.currentPlan.canExecute
        ? "Folder selection canceled. Previous plan is still loaded."
        : "Folder selection canceled. No files to copy.";
      enterPhase(state.currentPlan.canExecute ? phases.PLAN_READY : phases.PLAN_EMPTY, message);
      return;
    }

    if (!state.selectedDirectoryLabel) {
      setPlainText(ui.folder, "No folder selected.");
      hideReviewAndOutcomes();
      clearDynamicContent();
      setHidden(ui.emptyState, false);
      renderEmptyState("Ready to choose a folder", "Select a folder to scan direct files and preview subtitle copies before confirming.");
    }

    enterPhase(phases.IDLE, "Folder selection canceled.");
  }

  function setPhase(phase, message, isAlert = false) {
    state.phase = phase;
    ui.shell.dataset.phase = phase;
    ui.shell.setAttribute("aria-busy", phase === phases.SELECTING || phase === phases.SCANNING || phase === phases.EXECUTING ? "true" : "false");
    setStatus(message, isAlert);

    const hasDirectory = state.selectedDirectoryLabel.length > 0;
    const hasExecutablePlan = Boolean(state.currentPlan?.planId && state.currentPlan.canExecute);
    const busy = phase === phases.SELECTING || phase === phases.SCANNING || phase === phases.EXECUTING;
    const confirming = phase === phases.CONFIRMING;

    setButtons({
      select: busy,
      rescan: busy || confirming || !hasDirectory,
      copy: busy || confirming || !hasExecutablePlan,
      confirm: busy || !confirming,
      cancel: busy || !confirming,
    });
  }

  function focusElement(element) {
    if (!element.disabled && !element.hidden) {
      element.focus();
    }
  }

  function focusForPhase(phase) {
    if (phase === phases.PLAN_READY || phase === phases.COMPLETED || phase === phases.DECLINED || phase === phases.PARTIAL_FAILURE || phase === phases.EXECUTION_FAILURE || phase === phases.PLAN_EMPTY) {
      focusElement(ui.rescanButton.disabled ? ui.selectButton : ui.rescanButton);
    } else if (phase === phases.CONFIRMING) {
      focusElement(ui.cancelButton);
    } else if (phase === phases.PLANNING_FAILURE) {
      focusElement(ui.selectButton);
    }
  }

  function enterPhase(phase, message, isAlert = false) {
    setPhase(phase, message, isAlert);
    focusForPhase(phase);
  }

  async function beginPlanning(command) {
    const generation = ++state.requestGeneration;
    const selecting = command === "select_and_plan";
    setHidden(ui.confirmation, true);
    setHidden(ui.outcomes, true);
    if (!selecting) {
      hideReviewAndOutcomes();
      clearDynamicContent();
      state.currentPlan = null;
    }
    setHidden(ui.emptyState, Boolean(selecting && state.currentPlan?.planId));
    renderEmptyState(command === "select_and_plan" ? "Opening folder picker" : "Scanning selected folder", "Review data will replace this message after planning completes.");
    enterPhase(command === "select_and_plan" ? phases.SELECTING : phases.SCANNING, command === "select_and_plan" ? "Opening folder picker." : "Scanning selected folder.");

    if (selecting) {
      await nextFrame();
      if (generation !== state.requestGeneration) {
        return;
      }
      setPhase(phases.SCANNING, "Scanning selected folder.");
    }

    try {
      const snapshot = await invokeCommand(command);
      if (generation !== state.requestGeneration) {
        return;
      }
      if (selecting && snapshot === null) {
        restoreAfterCancelledSelection();
        return;
      }
      renderSnapshot(snapshot);
      focusForPhase(state.phase);
    } catch (error) {
      if (generation !== state.requestGeneration) {
        return;
      }
      state.currentPlan = null;
      hideReviewAndOutcomes();
      setHidden(ui.emptyState, false);
      renderEmptyState("Planning failed", "No copy operation ran. Select another folder or rescan the selected folder.");
      enterPhase(phases.PLANNING_FAILURE, humanError(error), true);
    }
  }

  function beginConfirmation() {
    if (!state.currentPlan?.canExecute) {
      return;
    }
    setHidden(ui.confirmation, false);
    enterPhase(phases.CONFIRMING, "Confirm to copy the planned subtitles, or cancel to discard this plan.");
  }

  async function discardCurrentPlan() {
    const planId = state.currentPlan?.planId;
    if (!planId) {
      return;
    }
    const generation = ++state.requestGeneration;
    setPhase(phases.EXECUTING, "Discarding current plan.");
    try {
      await invokeCommand("discard_plan", { planId });
    } catch (error) {
      if (generation !== state.requestGeneration) {
        return;
      }
      state.currentPlan = null;
      hideReviewAndOutcomes();
      clearDynamicContent();
      setHidden(ui.emptyState, false);
      renderEmptyState("Plan discarded locally", "The discard command reported an error. No copy operation ran.");
      enterPhase(phases.DECLINED, humanError(error), true);
      return;
    }
    if (generation !== state.requestGeneration) {
      return;
    }
    state.currentPlan = null;
    hideReviewAndOutcomes();
    clearDynamicContent();
    setHidden(ui.emptyState, false);
    renderEmptyState("Plan discarded", "No copy operation ran. Source subtitles remain untouched.");
    enterPhase(phases.DECLINED, "Copy declined. Source subtitles remain untouched.");
  }

  async function executeCurrentPlan() {
    const planId = state.currentPlan?.planId;
    if (!planId || state.phase === phases.EXECUTING) {
      return;
    }
    const generation = ++state.requestGeneration;
    setHidden(ui.confirmation, true);
    setPhase(phases.EXECUTING, "Copying planned subtitles.");
    try {
      const result = await invokeCommand("execute_plan", { planId });
      if (generation !== state.requestGeneration) {
        return;
      }
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
      hideReviewAndOutcomes();
      clearDynamicContent();
      setHidden(ui.emptyState, false);
      renderEmptyState("Copy did not run", "The current plan was not executed. Rescan before trying again.");
      state.currentPlan = null;
      enterPhase(phases.EXECUTION_FAILURE, humanError(error), true);
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
      h1Count: document.querySelectorAll("h1").length,
      statusText: ui.status.textContent,
      hostileText: ui.hostile.textContent,
      folderText: ui.folder.textContent,
      activeElement: document.activeElement?.textContent?.trim() ?? "",
    };
  }

  function bindEvents() {
    ui.selectButton.addEventListener("click", () => {
      void beginPlanning("select_and_plan");
    });
    ui.rescanButton.addEventListener("click", () => {
      void beginPlanning("rescan");
    });
    ui.copyButton.addEventListener("click", beginConfirmation);
    ui.cancelButton.addEventListener("click", () => {
      void discardCurrentPlan();
    });
    ui.confirmButton.addEventListener("click", () => {
      void executeCurrentPlan();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && state.phase === phases.CONFIRMING) {
        event.preventDefault();
        void discardCurrentPlan();
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    assertStaticSurface();
    collectUi();
    setPlainText(ui.folder, "No folder selected.");
    renderHostileProbe("");
    hideReviewAndOutcomes();
    renderEmptyState("Ready to choose a folder", "Select a folder to scan direct files and preview subtitle copies before confirming.");
    setPhase(phases.IDLE, "Waiting for a folder.");
    bindEvents();
    window.subtitleRenamerShell = Object.freeze({
      assertStaticSurface,
      renderHostileProbe,
      getSurfaceState,
    });
  });
})();
