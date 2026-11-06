import test from "node:test";
import assert from "node:assert/strict";
import { createNaturalMotion, type PipPose } from "../src/pipMotion";
const base: PipPose = {
  time: 0,
  delta: 1 / 60,
  open: 0,
  round: 0,
  listening: false,
  thinking: false,
  still: false,
  wave: -1,
  lookX: 0,
  lookY: 0,
};

test("le regard précède la tête et un changement d’attitude ne provoque pas de saut", () => {
  const motion = createNaturalMotion();
  motion(base);
  const first = motion({ ...base, time: 1 / 60, lookX: 1, listening: true });
  assert.ok(first.eyesX > 0 && first.headYaw > 0);
  assert.ok(first.eyesX / 0.65 > first.headYaw / (0.65 * 0.22));
  assert.ok(first.headTilt > 0 && first.headTilt < 0.005);
  let previous = first.headTilt;
  for (let frame = 2; frame < 60; frame++) {
    const pose = motion({
      ...base,
      time: frame / 60,
      lookX: 1,
      listening: frame < 35,
    });
    assert.ok(Math.abs(pose.headTilt - previous) < 0.003);
    previous = pose.headTilt;
  }
});

test("les clignements sont espacés et irréguliers, les mouvements restent bornés", () => {
  const motion = createNaturalMotion();
  const starts: number[] = [];
  let closed = false;
  for (let frame = 0; frame < 60 * 40; frame++) {
    const t = frame / 60;
    const pose = motion({
      ...base,
      time: t,
      lookX: Math.sin(t),
      listening: t > 12 && t < 16,
    });
    if (pose.blink < 0.5 && !closed) starts.push(t);
    closed = pose.blink < 0.5;
    assert.ok(pose.blink >= 0.025 && pose.blink <= 1);
    assert.ok(Math.abs(pose.headYaw) < 0.18);
    assert.ok(Math.abs(pose.tailYaw) < 0.07);
    assert.ok(Math.abs(pose.breath) < 0.009);
  }
  assert.ok(starts.length >= 5);
  const intervals = starts
    .slice(1)
    .map((start, i) => Math.round((start - starts[i]) * 10));
  assert.ok(new Set(intervals).size > 2);
});

test("la pause ferme la bouche et fige tous les gestes même au milieu d’un coucou", () => {
  const motion = createNaturalMotion();
  for (let frame = 0; frame < 60; frame++)
    motion({ ...base, time: frame / 60, wave: frame / 60, open: 1, lookX: 1 });
  const paused = motion({ ...base, time: 1, wave: 1, open: 1, still: true });
  assert.equal(paused.blink, 1);
  for (const [name, value] of Object.entries(paused))
    if (name !== "blink") assert.equal(value, 0, name);
  const stable = motion({
    ...base,
    time: 1.2,
    still: true,
    listening: true,
    lookX: -1,
  });
  assert.deepEqual(stable, paused);
});
