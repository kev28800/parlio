import type { Exercise, Lesson, Unit } from "./types";

type Choice = [string, string, string, string];
export interface LessonDraft {
  title: string;
  choice: Choice;
  pairs: [string, string][];
  phrase: [string, string];
  fill: [string, string[], string];
  write: [string, string, ...string[]];
  listen: Choice;
  contrast: Choice;
  finish: [string, string, ...string[]];
}
const unitTitles = [
  [
    "Les premiers mots",
    "Saluer, se présenter et faire connaissance.",
    "wave",
    "peach",
  ],
  [
    "Un peu plus sur vous",
    "Les nombres et les informations personnelles.",
    "numbers",
    "blue",
  ],
  [
    "Les gens qu’on aime",
    "Présenter sa famille et ses proches.",
    "people",
    "pink",
  ],
  [
    "Les petits riens du quotidien",
    "Les objets, la maison et les habitudes.",
    "home",
    "green",
  ],
  ["Une table pour deux", "Commander à manger et à boire.", "coffee", "yellow"],
  [
    "Le monde vous attend",
    "Voyager et trouver son chemin.",
    "compass",
    "purple",
  ],
];
function hash(value: string) {
  let h = 0;
  for (const c of value) h = (Math.imul(h, 31) + c.charCodeAt(0)) | 0;
  return h >>> 0;
}
function mix(values: string[], seed: string) {
  return [...values].sort((a, b) => hash(seed + a) - hash(seed + b));
}
/** Contenu éditorial séparé de l’interface ; relecture pédagogique avant commercialisation. */
export function buildCourse(
  language: string,
  label: string,
  drafts: LessonDraft[],
): Unit[] {
  if (drafts.length !== 18)
    throw new Error("Un cours doit contenir 18 leçons.");
  return unitTitles.map(([title, description, icon, color], unitIndex) => ({
    id: `${language}-u${unitIndex + 1}`,
    title,
    description,
    icon,
    color,
    lessons: drafts
      .slice(unitIndex * 3, unitIndex * 3 + 3)
      .map((draft, index): Lesson => {
        const id = `${language}-u${unitIndex + 1}-l${index + 1}`;
        const concept = (value: string) => `${language}:${value.toLowerCase()}`;
        const choose = (
          value: Choice,
          type: "choice" | "listen",
        ): Omit<Exercise, "id"> => ({
          concept: concept(value[0]),
          type,
          instruction:
            type === "choice"
              ? "Choisissez la bonne traduction"
              : "Écoutez, puis choisissez le sens de la phrase",
          prompt: type === "choice" ? value[0] : "À vous de tendre l’oreille",
          ...(type === "listen" ? { transcript: value[0] } : {}),
          options: mix(value.slice(1), id + value[0]),
          answers: [value[1]],
          explanation: `« ${value[0]} » signifie « ${value[1]} ».`,
        });
        const write = (value: LessonDraft["write"]): Omit<Exercise, "id"> => ({
          concept: concept(value[1]),
          type: "write",
          instruction: `Traduisez en ${label}`,
          prompt: value[0],
          answers: value.slice(1),
          explanation: `Pour dire « ${value[0]} », on peut écrire « ${value[1]} ».`,
        });
        const items: Omit<Exercise, "id">[] = [
          choose(draft.choice, "choice"),
          {
            concept: `${language}:lexique:${unitIndex * 3 + index + 1}`,
            type: "pairs",
            instruction: "Associez chaque mot à sa traduction",
            prompt: "Les mots qui vont ensemble",
            pairs: draft.pairs.map(([left, right]) => ({ left, right })),
            answers: [],
            explanation:
              draft.pairs
                .map(([left, right]) => `« ${left} » : « ${right} »`)
                .join(" ; ") + ".",
          },
          {
            concept: concept(draft.phrase[1]),
            type: "arrange",
            instruction: `Reconstituez la phrase en ${label}`,
            prompt: draft.phrase[0],
            words: mix(draft.phrase[1].split(" "), id),
            answers: [draft.phrase[1]],
            explanation: `La phrase complète est « ${draft.phrase[1]} » : « ${draft.phrase[0]} ».`,
          },
          {
            concept: `${language}:grammaire:${unitIndex * 3 + index + 1}`,
            type: "fill",
            instruction: "Complétez avec le mot manquant",
            prompt: draft.fill[0],
            answers: draft.fill[1],
            explanation: draft.fill[2],
          },
          write(draft.write),
          choose(draft.listen, "listen"),
          choose(draft.contrast, "choice"),
          write(draft.finish),
        ];
        return {
          id,
          title: draft.title,
          subtitle: `Vos premiers échanges en ${label}`,
          minutes: 5,
          exercises: items.map((item, i) => ({
            ...item,
            id: `${id}-${i + 1}`,
          })),
        };
      }),
  }));
}
