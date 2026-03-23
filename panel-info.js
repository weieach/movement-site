/**
 * .panel-info: cycle soundtrack → dancers → choreographer → designer → soundtrack.
 * Dancers → choreographer: bubbles collapse inward, text fades, then choreographer copy fades in.
 * Choreographer → designer: oval expands/splits outward into two ovals, then designer copy fades in.
 * Other steps: text-only sequential fades (bubbles stay).
 */
(function () {
  const panel = document.querySelector(".panel-info");
  const btn = document.querySelector(".btn-info-change");
  const icon = btn && btn.querySelector("i");

  if (!panel || !btn) return;

  const STATES = ["soundtrack", "dancers", "choreographer", "designer"];
  const COLLAPSE_MS = 720;
  const EXPAND_MS = 720;
  const STACK_FADE_OUT_MS = 380;
  const STACK_FADE_IN_MS = 480;

  const listSoundtrack = panel.querySelector(".panel-info-display--soundtrack");
  const listDancers = panel.querySelector(".panel-info-display--dancers");
  const blockChoreographer = panel.querySelector(
    ".panel-info-display--choreographer"
  );
  const blockDesigner = panel.querySelector(".panel-info-display--designer");

  const lineSoundtrack = panel.querySelector(".panel-info-line--soundtrack");
  const lineDancers = panel.querySelector(".panel-info-line--dancers");
  const lineChoreographer = panel.querySelector(
    ".panel-info-line--choreographer"
  );
  const lineDesigner = panel.querySelector(".panel-info-line--designer");

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function stackElForState(s) {
    if (s === "soundtrack") return listSoundtrack;
    if (s === "dancers") return listDancers;
    if (s === "designer") return blockDesigner;
    return blockChoreographer;
  }

  function lineElForState(s) {
    if (s === "soundtrack") return lineSoundtrack;
    if (s === "dancers") return lineDancers;
    if (s === "designer") return lineDesigner;
    return lineChoreographer;
  }

  function setStackDisplay(state) {
    listSoundtrack.classList.toggle("is-active", state === "soundtrack");
    listDancers.classList.toggle("is-active", state === "dancers");
    if (blockChoreographer) {
      blockChoreographer.classList.toggle("is-active", state === "choreographer");
    }
    if (blockDesigner) {
      blockDesigner.classList.toggle("is-active", state === "designer");
    }
  }

  function setFooterLines(state) {
    lineSoundtrack.classList.toggle("is-active", state === "soundtrack");
    lineDancers.classList.toggle("is-active", state === "dancers");
    if (lineChoreographer) {
      lineChoreographer.classList.toggle("is-active", state === "choreographer");
    }
    if (lineDesigner) {
      lineDesigner.classList.toggle("is-active", state === "designer");
    }
  }

  function resetDancerBubbleTransforms() {
    listDancers.querySelectorAll("li").forEach((li) => {
      li.style.removeProperty("transform");
      li.style.removeProperty("animation");
    });
  }

  function applyTheme(state, options = {}) {
    const { updateDataset = true } = options;
    panel.classList.toggle("panel-info--dancers", state === "dancers");
    panel.classList.toggle(
      "panel-info--choreographer",
      state === "choreographer"
    );
    panel.classList.toggle("panel-info--designer", state === "designer");
    if (updateDataset) {
      panel.dataset.panelState = state;
    }
  }

  function finalizePanelState(state) {
    panel.dataset.panelState = state;
  }

  function setActiveDisplay(state) {
    setStackDisplay(state);
    setFooterLines(state);
  }

  function setState(state) {
    applyTheme(state);
    setActiveDisplay(state);
    if (state === "dancers") {
      resetDancerBubbleTransforms();
    }
  }

  function waitTwoFrames(fn) {
    requestAnimationFrame(() => requestAnimationFrame(fn));
  }

  /* ── Dancers → Choreographer (collapse inward) ── */
  function finishDancersToChoreographerAfterCollapse() {
    listDancers.classList.add("is-collapse-handoff");
    void listDancers.offsetWidth;
    panel.classList.remove("panel-info--collapse-circles");
    resetDancerBubbleTransforms();
    listDancers.classList.remove(
      "is-active",
      "is-text-exit",
      "is-collapse-handoff"
    );
    finalizePanelState("choreographer");
    setStackDisplay("choreographer");
    setFooterLines("choreographer");
    if (lineDancers) {
      lineDancers.classList.remove("is-line-exiting");
    }
    if (blockChoreographer) {
      blockChoreographer.classList.add("is-text-enter");
    }
    if (lineChoreographer) {
      lineChoreographer.classList.add("is-line-entering");
    }
    waitTwoFrames(() => {
      if (blockChoreographer) {
        blockChoreographer.classList.remove("is-text-enter");
      }
      if (lineChoreographer) {
        lineChoreographer.classList.remove("is-line-entering");
      }
    });
    window.setTimeout(() => {
      btn.disabled = false;
    }, STACK_FADE_IN_MS);
  }

  /* ── Choreographer → Designer (expand outward) ── */
  function finishChoreographerToDesignerAfterExpand() {
    // Remove expand animation class — ovals are now in their resting positions
    panel.classList.remove("panel-info--expand-oval");

    // Hide choreographer
    if (blockChoreographer) {
      blockChoreographer.classList.remove("is-active", "is-text-exit");
    }
    if (lineChoreographer) {
      lineChoreographer.classList.remove("is-line-exiting");
    }

    finalizePanelState("designer");
    setStackDisplay("designer");
    setFooterLines("designer");

    // blockDesigner is already is-active (added in goToNextState); fade the text in
    if (blockDesigner) {
      blockDesigner.classList.add("is-text-enter");
    }
    if (lineDesigner) {
      lineDesigner.classList.add("is-line-entering");
    }

    waitTwoFrames(() => {
      if (blockDesigner) {
        blockDesigner.classList.remove("is-text-enter");
      }
      if (lineDesigner) {
        lineDesigner.classList.remove("is-line-entering");
      }
    });

    window.setTimeout(() => {
      btn.disabled = false;
    }, STACK_FADE_IN_MS);
  }

  /**
   * Fade out current stack + footer line, then theme/swap, then fade in next.
   */
  function sequentialFadeToState(fromState, toState, opts = {}) {
    const { skipTheme = false, themeState = toState } = opts;

    if (reduceMotion.matches) {
      if (!skipTheme) applyTheme(themeState);
      finalizePanelState(toState);
      setStackDisplay(toState);
      setFooterLines(toState);
      if (toState === "dancers") resetDancerBubbleTransforms();
      return;
    }

    const fromStack = stackElForState(fromState);
    const toStack = stackElForState(toState);
    const fromLine = lineElForState(fromState);
    const toLine = lineElForState(toState);

    if (!fromStack || !toStack) {
      if (!skipTheme) applyTheme(themeState);
      finalizePanelState(toState);
      setActiveDisplay(toState);
      if (toState === "dancers") resetDancerBubbleTransforms();
      return;
    }

    btn.disabled = true;

    fromStack.classList.add("is-text-exit");
    if (fromLine) fromLine.classList.add("is-line-exiting");

    window.setTimeout(() => {
      fromStack.classList.remove("is-active", "is-text-exit");
      if (fromLine) fromLine.classList.remove("is-active", "is-line-exiting");

      if (!skipTheme) {
        applyTheme(themeState, { updateDataset: false });
      }
      finalizePanelState(toState);

      if (toState === "dancers") {
        resetDancerBubbleTransforms();
      }

      toStack.classList.add("is-active", "is-text-enter");
      if (toLine) {
        toLine.classList.add("is-active", "is-line-entering");
      }

      waitTwoFrames(() => {
        toStack.classList.remove("is-text-enter");
        if (toLine) toLine.classList.remove("is-line-entering");
      });

      window.setTimeout(() => {
        btn.disabled = false;
      }, STACK_FADE_IN_MS);
    }, STACK_FADE_OUT_MS);
  }

  function currentStateIndex() {
    const s = panel.dataset.panelState || "soundtrack";
    const i = STATES.indexOf(s);
    return i >= 0 ? i : 0;
  }

  function spinIcon() {
    if (reduceMotion.matches) return;
    btn.classList.remove("is-spinning");
    void btn.offsetWidth;
    btn.classList.add("is-spinning");
  }

  function goToNextState() {
    const i = currentStateIndex();
    const from = STATES[i];
    const to = STATES[(i + 1) % STATES.length];

    spinIcon();

    /* Dancers → choreographer: collapse bubbles inward */
    if (from === "dancers" && to === "choreographer" && !reduceMotion.matches) {
      btn.disabled = true;
      applyTheme("choreographer", { updateDataset: false });
      setFooterLines("dancers");
      listDancers.classList.add("is-text-exit");
      if (lineDancers) {
        lineDancers.classList.add("is-line-exiting");
      }
      panel.classList.add("panel-info--collapse-circles");
      window.setTimeout(() => {
        finishDancersToChoreographerAfterCollapse();
      }, COLLAPSE_MS);
      return;
    }

    /* Choreographer → designer: oval splits outward into two */
    if (from === "choreographer" && to === "designer" && !reduceMotion.matches) {
      btn.disabled = true;
      applyTheme("designer", { updateDataset: false });
      setFooterLines("choreographer");

      if (blockChoreographer) {
        blockChoreographer.classList.add("is-text-exit");
      }
      if (lineChoreographer) {
        lineChoreographer.classList.add("is-line-exiting");
      }

      // Show designer display immediately so its two ovals can animate (CSS splits them apart)
      if (blockDesigner) {
        blockDesigner.classList.add("is-active");
      }

      panel.classList.add("panel-info--expand-oval");
      window.setTimeout(() => {
        finishChoreographerToDesignerAfterExpand();
      }, EXPAND_MS);
      return;
    }

    if (reduceMotion.matches) {
      setState(to);
      return;
    }

    sequentialFadeToState(from, to);
  }

  btn.addEventListener("click", goToNextState);

  if (icon) {
    icon.addEventListener("animationend", () => {
      btn.classList.remove("is-spinning");
    });
  }

  const initial = panel.dataset.panelState || "soundtrack";
  if (STATES.includes(initial)) {
    setState(initial);
  }
})();
