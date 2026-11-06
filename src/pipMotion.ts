export interface PipPose {
  time: number;
  delta: number;
  frameDuration?: number;
  open: number;
  round: number;
  listening: boolean;
  thinking: boolean;
  still: boolean;
  wave: number;
  lookX: number;
  lookY: number;
}
const smooth = (value: number) => {
  const x = Math.max(0, Math.min(1, value));
  return x * x * (3 - 2 * x);
};

/** Independent eyes/head timing, irregular blinks and damped joints in both renderers. */
export function createNaturalMotion(seed = 2819) {
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const channels = new Map<string, { value: number; velocity: number }>();
  let nextGlance = 1.4,
    glanceX = 0,
    glanceY = 0;
  let nextBlink = 2.4 + random() * 1.9,
    blinkStart = -10;
  let nextEar = 3 + random() * 3,
    earStart = -10,
    earSide = 0;
  return function motion(pose: PipPose) {
    const t = pose.time,
      dt = Math.min(0.06, Math.max(0, pose.delta));
    function joint(name: string, target: number, speed: number) {
      let state = channels.get(name);
      if (!state) {
        state = { value: 0, velocity: 0 };
        channels.set(name, state);
      }
      if (pose.still) {
        state.value = state.velocity = 0;
        return 0;
      }
      const change = state.value - target;
      const temp = (state.velocity + speed * change) * dt;
      const decay = Math.exp(-speed * dt);
      state.velocity = (state.velocity - speed * temp) * decay;
      state.value = target + (change + temp) * decay;
      return state.value;
    }
    if (!pose.still && t >= nextGlance) {
      glanceX = (random() - 0.5) * 0.19;
      glanceY = (random() - 0.5) * 0.1;
      nextGlance = t + 1.7 + random() * 3.2;
    }
    if (!pose.still && t >= nextBlink) {
      blinkStart = t;
      nextBlink = t + (random() < 0.17 ? 0.34 : 2.6 + random() * 4.5);
    }
    const blinkAge = t - blinkStart;
    const blink =
      pose.still || blinkAge < 0 || blinkAge > 0.23
        ? 1
        : blinkAge < 0.075
          ? 1 - smooth(blinkAge / 0.075) * 0.975
          : blinkAge < 0.095
            ? 0.025
            : 0.025 + smooth((blinkAge - 0.095) / 0.135) * 0.975;
    if (!pose.still && t >= nextEar) {
      earStart = t;
      earSide = random() > 0.5 ? 1 : -1;
      nextEar = t + 3.2 + random() * 5;
    }
    const earAge = t - earStart;
    const earFlick =
      earAge >= 0 && earAge < 0.42
        ? Math.sin((earAge / 0.42) * Math.PI) * 0.07
        : 0;
    const wave =
      pose.wave >= 0 && pose.wave < 2.4
        ? Math.pow(Math.sin((pose.wave / 2.4) * Math.PI), 1.3)
        : 0;
    const gazeX = pose.lookX * 0.65 + glanceX;
    const gazeY = pose.lookY * 0.5 + glanceY;
    return {
      blink,
      eyesX: joint("eyesX", gazeX, 15),
      eyesY: joint("eyesY", gazeY, 15),
      headYaw: joint("headYaw", gazeX * 0.22, 5.5),
      headPitch: joint(
        "headPitch",
        gazeY * 0.1 + Math.sin(t * 0.65) * 0.006,
        5,
      ),
      headTilt: joint(
        "headTilt",
        pose.listening ? 0.085 : pose.thinking ? -0.055 : glanceX * 0.1,
        4.5,
      ),
      bodyYaw: joint("bodyYaw", gazeX * 0.035, 2.6),
      breath: pose.still
        ? 0
        : (Math.sin(t * 1.65) + Math.sin(t * 0.42) * 0.15) * 0.007,
      tailYaw: joint(
        "tailYaw",
        (pose.listening ? 0.045 : 0) + wave * 0.12 + Math.sin(t * 0.48) * 0.022,
        2.8,
      ),
      tailRoll: joint(
        "tailRoll",
        Math.sin(t * 0.31) * 0.015 + wave * 0.035,
        2.4,
      ),
      earLeft: joint(
        "earLeft",
        (pose.listening ? -0.055 : 0) + (earSide === -1 ? earFlick : 0),
        9,
      ),
      earRight: joint(
        "earRight",
        (pose.listening ? 0.055 : 0) - (earSide === 1 ? earFlick : 0),
        9,
      ),
      shoulder: joint("shoulder", wave * 1.65, 8),
      elbow: joint("elbow", wave * (1.2 + Math.sin(pose.wave * 8) * 0.08), 9),
      open: joint("mouth", pose.open, 42),
      round: joint("round", pose.round, 30),
    };
  };
}
