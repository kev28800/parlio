import test from "node:test";
import assert from "node:assert/strict";
import {
  courses,
  lessons,
  exercises,
  isUnlocked,
  nextLesson,
} from "../shared/courses";
import { grade, normalizeAnswer } from "../shared/learning";

test("trois langues, 54 leçons et 432 exercices dont les réponses et variantes sont cohérentes", () => {
  assert.deepEqual(
    courses.map((c) => c.id),
    ["en", "es", "de"],
  );
  assert.equal(lessons.length, 54);
  assert.equal(exercises.length, 432);
  assert.equal(new Set(exercises.map((e) => e.id)).size, 432);
  for (const course of courses) {
    assert.equal(course.units.length, 6);
    for (const unit of course.units) {
      assert.equal(unit.lessons.length, 3);
      for (const lesson of unit.lessons) {
        assert.equal(lesson.exercises.length, 8);
        assert.equal(new Set(lesson.exercises.map((e) => e.type)).size, 6);
        for (const e of lesson.exercises) {
          assert.ok(e.explanation.length > 20, e.id);
          if (e.type === "pairs") {
            assert.equal(e.pairs!.length, 3);
            assert.equal(
              new Set(e.pairs!.map((p) => normalizeAnswer(p.left))).size,
              3,
            );
            assert.equal(
              new Set(e.pairs!.map((p) => normalizeAnswer(p.right))).size,
              3,
            );
            assert.ok(
              grade(
                e,
                Object.fromEntries(e.pairs!.map((p) => [p.left, p.right])),
              ),
              e.id,
            );
            assert.ok(!grade(e, {}), e.id);
          } else {
            assert.ok(e.answers.length, e.id);
            for (const expected of e.answers)
              assert.ok(grade(e, expected), e.id);
            assert.ok(!grade(e, "Une traduction sans aucun rapport"), e.id);
          }
          if (e.options) {
            assert.equal(
              new Set(e.options.map(normalizeAnswer)).size,
              e.options.length,
              e.id,
            );
            assert.equal(e.options.filter((o) => grade(e, o)).length, 1, e.id);
          }
          if (e.type === "arrange")
            assert.deepEqual(
              [...e.words!].sort(),
              e.answers[0].split(" ").sort(),
              e.id,
            );
          if (e.type === "listen") assert.ok(e.transcript, e.id);
        }
      }
    }
  }
  assert.ok(isUnlocked("es-u1-l1", []));
  assert.ok(isUnlocked("de-u1-l1", []));
  assert.ok(!isUnlocked("es-u1-l2", ["u1-l1", "de-u1-l1"]));
  assert.ok(!isUnlocked("de-u1-l2", ["es-u1-l1"]));
  assert.equal(nextLesson(["es-u1-l1"], "es")?.id, "es-u1-l2");
  assert.equal(nextLesson(["es-u1-l1"], "de")?.id, "de-u1-l1");
});
test("les accents qui changent le sens ne sont pas supprimés", () => {
  const yes = exercises.find(
    (e) => e.type === "write" && e.answers[0] === "Sí",
  )!;
  assert.ok(grade(yes, "SÍ!"));
  assert.ok(!grade(yes, "si"));
  const five = exercises.find(
    (e) => e.type === "fill" && e.answers[0] === "fünf",
  )!;
  assert.ok(grade(five, "FÜNF"));
  assert.ok(!grade(five, "funf"));
});
