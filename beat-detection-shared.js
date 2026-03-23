/**
 * Shared beat-detection state + step (same rhythm as dancer.js).
 * Call MovementBeatDetection.step(amp, maxFn) once per frame from dancer.js only.
 * Optional: other sketches can call consumeBeatEvent() after dancer has run (each beat
 * queues 2 consumptions). face-squares uses getBeatCount() only.
 */
(function (global) {
  const beat = {
    threshold: 0.2,
    decayRate: 0.98,
    holdTimeMs: 120,
    lastBeatMs: 0,
    minThreshold: 0.2,
  };

  /** How many consumeBeatEvent() calls still return true for the current beat. */
  let pendingBeatSamples = 0;

  /** Increments on each beat (for face-squares palette, etc.). Read-only via getBeatCount(). */
  let beatCounter = 0;

  function step(amp, maxFn) {
    if (!amp || typeof amp.getLevel !== "function") {
      return { beatTriggered: false, now: performance.now(), level: 0 };
    }
    const level = amp.getLevel();
    const now = performance.now();
    const inHold = now - beat.lastBeatMs < beat.holdTimeMs;
    let beatTriggered = false;
    if (!inHold && level > beat.threshold) {
      beat.lastBeatMs = now;
      beat.threshold = level;
      beatTriggered = true;
      pendingBeatSamples = 2;
      beatCounter += 1;
    }
    beat.threshold = maxFn(beat.minThreshold, beat.threshold * beat.decayRate);
    return { beatTriggered, now, level };
  }

  /** Returns true up to 2 times per beat (face-squares: sample on two consecutive draws). */
  function consumeBeatEvent() {
    if (pendingBeatSamples > 0) {
      pendingBeatSamples -= 1;
      return true;
    }
    return false;
  }

  function getBeatCount() {
    return beatCounter;
  }

  global.MovementBeatDetection = {
    beat,
    step,
    consumeBeatEvent,
    getBeatCount,
  };
})(typeof window !== "undefined" ? window : globalThis);
