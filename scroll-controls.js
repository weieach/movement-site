/**
 * .btns-overall-control: scroll-to-top (1st), pause/play media (2nd).
 * Space bar toggles play/pause (same as middle button), except when typing in a field.
 */
(function () {
  const wrap = document.querySelector(".btns-overall-control");
  const buttons = wrap ? wrap.querySelectorAll("button") : [];
  const scrollBtn = buttons[0];
  const pauseBtn = buttons[1];
  const volumeBtn = buttons[2];

  const ICON_VOLUME_ON =
    '<i class="ph-fill ph-speaker-simple-high" aria-hidden="true"></i>';
  const ICON_VOLUME_MUTED =
    '<i class="ph-fill ph-speaker-simple-x" aria-hidden="true"></i>';

  function syncVolumeButton(muted) {
    if (!volumeBtn) return;
    volumeBtn.innerHTML = muted ? ICON_VOLUME_MUTED : ICON_VOLUME_ON;
    volumeBtn.classList.toggle("btn-volume-muted", !!muted);
    volumeBtn.setAttribute("aria-label", muted ? "Unmute" : "Mute");
  }

  const ICON_PAUSE =
    '<i class="ph-fill ph-pause" aria-hidden="true"></i>';
  const ICON_PLAY =
    '<i class="ph-fill ph-play" aria-hidden="true"></i>';

  function syncPauseButtonIcon(playing) {
    if (!pauseBtn) return;
    pauseBtn.innerHTML = playing ? ICON_PAUSE : ICON_PLAY;
    pauseBtn.setAttribute("aria-label", playing ? "Pause" : "Play");
  }

  function togglePlaybackFromUi() {
    const api = window.movementSiteAudio;
    if (!api || typeof api.togglePlayback !== "function") return;
    const playing = api.togglePlayback();
    syncPauseButtonIcon(playing);
  }

  window.addEventListener("keydown", (e) => {
    if (e.code !== "Space" && e.key !== " ") return;
    const t = e.target;
    if (
      t &&
      t.closest &&
      t.closest("input, textarea, select, [contenteditable='true']")
    ) {
      return;
    }
    e.preventDefault();
    togglePlaybackFromUi();
  });

  if (scrollBtn) {
    scrollBtn.addEventListener("click", () => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)")
        .matches;
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: reduce ? "auto" : "smooth",
      });
    });
  }

  if (pauseBtn) {
    pauseBtn.type = "button";
    pauseBtn.addEventListener("click", togglePlaybackFromUi);
  }

  if (volumeBtn) {
    volumeBtn.type = "button";
    volumeBtn.addEventListener("click", () => {
      const api = window.movementSiteAudio;
      if (!api || typeof api.toggleMute !== "function") return;
      api.toggleMute();
    });
  }

  window.addEventListener("movementMuteChange", (e) => {
    if (e.detail && typeof e.detail.muted === "boolean") {
      syncVolumeButton(e.detail.muted);
    }
  });

  window.addEventListener("movementPlaybackChange", (e) => {
    if (e.detail && typeof e.detail.playing === "boolean") {
      syncPauseButtonIcon(e.detail.playing);
    }
  });
})();
