import type { Exercise, Lesson, Unit } from "./types";

// Contenu éditorial original, à relire par un enseignant avant commercialisation.
// Les réponses sont exactes après normalisation ; les variantes sont explicites.
type Draft = Omit<Exercise, "id">;
const mix = (items: string[], seed: string) =>
  [...items].sort((a, b) => hash(seed + a) - hash(seed + b));
function hash(s: string) {
  let h = 0;
  for (const c of s) h = (Math.imul(h, 31) + c.charCodeAt(0)) | 0;
  return h >>> 0;
}
const c = (
  concept: string,
  prompt: string,
  answer: string,
  others: string[],
  explanation: string,
): Draft => ({
  concept,
  type: "choice",
  instruction: "Choisissez la bonne traduction",
  prompt,
  answers: [answer],
  options: mix([answer, ...others], prompt),
  explanation,
});
const w = (
  concept: string,
  prompt: string,
  answers: string[],
  explanation: string,
): Draft => ({
  concept,
  type: "write",
  instruction: "Traduisez en anglais",
  prompt,
  answers,
  explanation,
});
const a = (
  concept: string,
  prompt: string,
  sentence: string,
  explanation: string,
): Draft => ({
  concept,
  type: "arrange",
  instruction: "Reconstituez la phrase en anglais",
  prompt,
  answers: [sentence],
  words: mix(sentence.split(" "), prompt),
  explanation,
});
const f = (
  concept: string,
  prompt: string,
  answers: string[],
  explanation: string,
): Draft => ({
  concept,
  type: "fill",
  instruction: "Complétez avec le mot anglais manquant",
  prompt,
  answers,
  explanation,
});
const l = (
  concept: string,
  transcript: string,
  answer: string,
  others: string[],
  explanation: string,
): Draft => ({
  concept,
  type: "listen",
  instruction: "Écoutez, puis choisissez le sens de la phrase",
  prompt: "À vous de tendre l’oreille",
  transcript,
  options: mix([answer, ...others], transcript),
  answers: [answer],
  explanation,
});
const p = (
  concept: string,
  pairs: [string, string][],
  explanation: string,
): Draft => ({
  concept,
  type: "pairs",
  instruction: "Associez chaque mot à sa traduction",
  prompt: "Les mots qui vont ensemble",
  pairs: pairs.map(([left, right]) => ({ left, right })),
  answers: [],
  explanation,
});
const lesson = (
  id: string,
  title: string,
  subtitle: string,
  drafts: Draft[],
): Lesson => ({
  id,
  title,
  subtitle,
  minutes: 5,
  exercises: drafts.map((e, i) => ({ ...e, id: `${id}-${i + 1}` })),
});

export const course: Unit[] = [
  {
    id: "u1",
    title: "Les premiers mots",
    description: "Saluer, se présenter et faire connaissance.",
    icon: "wave",
    color: "peach",
    lessons: [
      lesson("u1-l1", "Hello, vous !", "Vos tout premiers échanges", [
        c(
          "hello",
          "Hello",
          "Bonjour",
          ["Au revoir", "Merci"],
          "« Hello » est une façon courante de dire bonjour.",
        ),
        p(
          "greetings",
          [
            ["hello", "bonjour"],
            ["goodbye", "au revoir"],
            ["thank you", "merci"],
          ],
          "« Hello » ouvre la conversation, « goodbye » la termine, et « thank you » remercie.",
        ),
        a(
          "i-am",
          "Je suis Emma.",
          "I am Emma",
          "Pour se présenter, on utilise « I am » suivi de son prénom.",
        ),
        f(
          "i-am",
          "I ___ Emma. (Je suis Emma.)",
          ["am"],
          "Avec « I », le verbe « be » devient « am ».",
        ),
        w(
          "thanks",
          "Merci.",
          ["Thank you", "Thanks"],
          "« Thank you » et « Thanks » expriment tous deux un remerciement.",
        ),
        l(
          "hello",
          "Hello",
          "Bonjour",
          ["Merci", "Bonne nuit"],
          "Vous avez entendu « Hello », qui signifie « Bonjour ».",
        ),
        c(
          "goodbye",
          "Goodbye",
          "Au revoir",
          ["Bonjour", "S’il vous plaît"],
          "« Goodbye » s’utilise lorsque l’on prend congé.",
        ),
        w(
          "i-am",
          "Je suis Alex.",
          ["I am Alex", "I’m Alex"],
          "« I am Alex » peut aussi se contracter en « I’m Alex ».",
        ),
      ]),
      lesson("u1-l2", "Enchanté !", "Faire connaissance, tout simplement", [
        c(
          "name",
          "My name is Sam.",
          "Je m’appelle Sam.",
          ["Je vais bien.", "Au revoir Sam."],
          "« My name is… » sert à donner son prénom.",
        ),
        p(
          "courtesy",
          [
            ["please", "s’il vous plaît"],
            ["sorry", "désolé"],
            ["yes", "oui"],
          ],
          "« Please » accompagne une demande ; « sorry » présente des excuses.",
        ),
        a(
          "name",
          "Je m’appelle Léa.",
          "My name is Léa",
          "L’ordre est « My » (mon), « name » (nom), « is » (est), puis le prénom.",
        ),
        f(
          "nice-meet",
          "Nice to ___ you. (Enchanté de vous rencontrer.)",
          ["meet"],
          "« Nice to meet you » s’emploie à la première rencontre.",
        ),
        w(
          "yes",
          "Oui.",
          ["Yes"],
          "« Yes » signifie « Oui » ; « No » signifie « Non ».",
        ),
        l(
          "name",
          "My name is Sam",
          "Je m’appelle Sam.",
          ["Je suis désolé.", "Merci Sam."],
          "« My name is Sam » donne le prénom de la personne.",
        ),
        c(
          "how-are-you",
          "How are you?",
          "Comment allez-vous ?",
          ["Comment vous appelez-vous ?", "Où êtes-vous ?"],
          "« How are you? » demande comment va la personne.",
        ),
        w(
          "nice-meet",
          "Enchanté de vous rencontrer.",
          ["Nice to meet you", "Pleased to meet you"],
          "« Nice to meet you » et « Pleased to meet you » conviennent à une première rencontre.",
        ),
      ]),
      lesson("u1-l3", "Ça va bien, merci", "Une première petite conversation", [
        c(
          "well",
          "I am fine, thank you.",
          "Je vais bien, merci.",
          ["Je suis fatigué.", "Je m’appelle Fine."],
          "« I am fine » répond à « How are you? ».",
        ),
        p(
          "times",
          [
            ["good morning", "bonjour le matin"],
            ["good evening", "bonsoir"],
            ["good night", "bonne nuit"],
          ],
          "« Good night » se dit pour souhaiter une bonne nuit, souvent en partant.",
        ),
        a(
          "how-are-you",
          "Comment allez-vous ?",
          "How are you",
          "Dans cette question, le verbe « are » se place avant « you ».",
        ),
        f(
          "well",
          "I am ___, thank you. (Je vais bien, merci.)",
          ["fine", "well"],
          "« Fine » et « well » indiquent ici que vous allez bien.",
        ),
        w(
          "please",
          "S’il vous plaît.",
          ["Please"],
          "Ajoutez « please » pour formuler une demande polie.",
        ),
        l(
          "times",
          "Good evening",
          "Bonsoir",
          ["Bonne nuit", "Au revoir"],
          "« Evening » désigne le soir ; « Good evening » signifie « Bonsoir ».",
        ),
        c(
          "you-too",
          "You too!",
          "Vous aussi !",
          ["Vous seul !", "Pas vous !"],
          "« You too » permet de retourner un souhait à quelqu’un.",
        ),
        w(
          "well",
          "Je vais bien, merci.",
          [
            "I am fine thank you",
            "I’m fine thank you",
            "I am well thank you",
            "I’m well thank you",
          ],
          "« I’m » est la contraction de « I am ». La virgule ne change pas le sens.",
        ),
      ]),
    ],
  },
  {
    id: "u2",
    title: "Un peu plus sur vous",
    description: "Les nombres et les informations personnelles.",
    icon: "numbers",
    color: "blue",
    lessons: [
      lesson("u2-l1", "Un, deux, three !", "Compter de un à dix", [
        c(
          "three",
          "three",
          "trois",
          ["deux", "dix"],
          "« Three » correspond au nombre 3.",
        ),
        p(
          "numbers-small",
          [
            ["one", "un"],
            ["two", "deux"],
            ["four", "quatre"],
          ],
          "Les quatre premiers nombres sont « one, two, three, four ».",
        ),
        a(
          "count-objects",
          "J’ai deux livres.",
          "I have two books",
          "Après « two », « book » prend un « s » : « books ».",
        ),
        f(
          "five",
          "one, two, three, four, ___ (cinq)",
          ["five"],
          "« Five » signifie cinq.",
        ),
        w("ten", "dix", ["ten"], "Dix s’écrit « ten » en anglais."),
        l(
          "eight",
          "eight",
          "huit",
          ["six", "neuf"],
          "« Eight » signifie huit. Le « gh » est muet.",
        ),
        c(
          "seven",
          "seven",
          "sept",
          ["six", "neuf"],
          "« Seven » est le nombre sept.",
        ),
        w(
          "six",
          "six (le nombre)",
          ["six"],
          "Le nombre six s’écrit de la même manière dans les deux langues.",
        ),
      ]),
      lesson("u2-l2", "Parlons de vous", "Dire son âge et son origine", [
        c(
          "age",
          "I am twenty years old.",
          "J’ai vingt ans.",
          ["J’ai deux ans.", "J’ai trente ans."],
          "En anglais, l’âge se dit avec « be » : littéralement « je suis âgé de vingt ans ».",
        ),
        p(
          "numbers-age",
          [
            ["twenty", "vingt"],
            ["thirty", "trente"],
            ["forty", "quarante"],
          ],
          "On écrit bien « forty », sans « u ».",
        ),
        a(
          "from",
          "Je viens de France.",
          "I am from France",
          "« I am from » permet d’indiquer son pays d’origine.",
        ),
        f(
          "from",
          "I am ___ France. (Je viens de France.)",
          ["from"],
          "La préposition « from » indique ici l’origine.",
        ),
        w(
          "age",
          "J’ai vingt ans.",
          [
            "I am twenty years old",
            "I’m twenty years old",
            "I am twenty",
            "I’m twenty",
          ],
          "Pour donner son âge, on dit « I am twenty », et non « I have twenty ».",
        ),
        l(
          "from",
          "I am from France",
          "Je viens de France.",
          ["J’habite en Angleterre.", "J’ai vingt ans."],
          "« From France » signifie « de France ».",
        ),
        c(
          "age-question",
          "How old are you?",
          "Quel âge avez-vous ?",
          ["Comment allez-vous ?", "D’où venez-vous ?"],
          "« How old » permet de poser une question sur l’âge.",
        ),
        w(
          "from",
          "Je viens du Canada.",
          ["I am from Canada", "I’m from Canada"],
          "On ne met pas d’article devant « Canada » dans cette phrase.",
        ),
      ]),
      lesson("u2-l3", "Restons en contact", "Un numéro et une adresse", [
        c(
          "phone",
          "phone number",
          "numéro de téléphone",
          ["adresse postale", "prénom"],
          "« Phone » désigne le téléphone, « number » le numéro.",
        ),
        p(
          "contact",
          [
            ["email", "courriel"],
            ["address", "adresse"],
            ["zero", "zéro"],
          ],
          "« Address » s’écrit avec deux « d » et deux « s ».",
        ),
        a(
          "live",
          "J’habite à Paris.",
          "I live in Paris",
          "Avec une ville, on utilise généralement « in » après « live ».",
        ),
        f(
          "live",
          "I live ___ London. (J’habite à Londres.)",
          ["in"],
          "« In London » signifie « à Londres ».",
        ),
        w("nine", "neuf (le nombre)", ["nine"], "Neuf se dit « nine »."),
        l(
          "phone",
          "My phone number",
          "Mon numéro de téléphone",
          ["Mon adresse", "Mon prénom"],
          "« My » signifie « mon » ou « ma » selon le nom français.",
        ),
        c(
          "where-live",
          "Where do you live?",
          "Où habitez-vous ?",
          ["Quel âge avez-vous ?", "Quel est votre prénom ?"],
          "« Where » introduit une question sur le lieu.",
        ),
        w(
          "live",
          "J’habite à Londres.",
          ["I live in London"],
          "« I live in London » : sujet, verbe, préposition, ville.",
        ),
      ]),
    ],
  },
  {
    id: "u3",
    title: "Les gens qu’on aime",
    description: "Présenter sa famille et ses proches.",
    icon: "people",
    color: "pink",
    lessons: [
      lesson("u3-l1", "Ma petite tribu", "Les mots de la famille", [
        c(
          "mother",
          "mother",
          "mère",
          ["père", "sœur"],
          "« Mother » signifie « mère » ; « mum » est plus familier.",
        ),
        p(
          "family",
          [
            ["father", "père"],
            ["sister", "sœur"],
            ["brother", "frère"],
          ],
          "« Sister » et « brother » permettent de parler de ses frères et sœurs.",
        ),
        a(
          "my-family",
          "Voici ma mère.",
          "This is my mother",
          "« This is… » sert à présenter une personne.",
        ),
        f(
          "my-family",
          "This is ___ father. (Voici mon père.)",
          ["my"],
          "« My » est identique devant un nom masculin ou féminin.",
        ),
        w(
          "sister",
          "ma sœur",
          ["my sister"],
          "« My sister » signifie « ma sœur ».",
        ),
        l(
          "brother",
          "This is my brother",
          "Voici mon frère.",
          ["Voici mon père.", "Voici ma sœur."],
          "« Brother » signifie « frère ».",
        ),
        c(
          "parents",
          "parents",
          "parents",
          ["enfants", "amis"],
          "Le mot « parents » a le même sens dans les deux langues.",
        ),
        w(
          "my-family",
          "Voici mon père.",
          ["This is my father", "This is my dad"],
          "« Father » et « dad » désignent le père, dans des registres différents.",
        ),
      ]),
      lesson("u3-l2", "Elle, lui et nous", "Parler des autres", [
        c(
          "she",
          "She is my sister.",
          "Elle est ma sœur.",
          ["Il est mon frère.", "Nous sommes amis."],
          "« She » est le pronom « elle ».",
        ),
        p(
          "pronouns",
          [
            ["he", "il"],
            ["she", "elle"],
            ["we", "nous"],
          ],
          "Le verbe « be » change : « he is », « she is », « we are ».",
        ),
        a(
          "we-are",
          "Nous sommes amis.",
          "We are friends",
          "Avec « we », on utilise « are » et non « is ».",
        ),
        f(
          "he-is",
          "He ___ my brother. (Il est mon frère.)",
          ["is"],
          "« He » est suivi de « is ».",
        ),
        w(
          "she",
          "Elle est Emma.",
          ["She is Emma", "She’s Emma"],
          "« She is » peut se contracter en « She’s ».",
        ),
        l(
          "we-are",
          "We are friends",
          "Nous sommes amis.",
          ["Ils sont frères.", "Elle est mon amie."],
          "« We » signifie « nous », et « friends » signifie « amis ».",
        ),
        c(
          "they",
          "They are here.",
          "Ils sont ici.",
          ["Je suis ici.", "Vous êtes là-bas."],
          "« They » est le pronom pluriel « ils » ou « elles ».",
        ),
        w(
          "we-are",
          "Nous sommes ici.",
          ["We are here", "We’re here"],
          "« Here » indique un lieu proche : « ici ».",
        ),
      ]),
      lesson("u3-l3", "Qui est-ce ?", "Décrire une personne simplement", [
        c(
          "kind",
          "She is kind.",
          "Elle est gentille.",
          ["Elle est grande.", "Elle est jeune."],
          "« Kind » décrit une personne gentille ou bienveillante.",
        ),
        p(
          "adjectives",
          [
            ["tall", "grand de taille"],
            ["young", "jeune"],
            ["happy", "heureux"],
          ],
          "Les adjectifs anglais ne prennent pas de « s » au pluriel.",
        ),
        a(
          "happy",
          "Mon frère est heureux.",
          "My brother is happy",
          "L’adjectif « happy » se place ici après « is ».",
        ),
        f(
          "kind",
          "She is ___. (Elle est gentille.)",
          ["kind", "nice"],
          "« Kind » et « nice » peuvent tous deux qualifier une personne gentille.",
        ),
        w(
          "friend",
          "mon ami",
          ["my friend"],
          "« Friend » désigne un ami ou une amie.",
        ),
        l(
          "young",
          "He is young",
          "Il est jeune.",
          ["Il est grand.", "Il est fatigué."],
          "« Young » signifie « jeune ».",
        ),
        c(
          "who",
          "Who is she?",
          "Qui est-elle ?",
          ["Où est-elle ?", "Comment va-t-elle ?"],
          "« Who » permet de demander l’identité d’une personne.",
        ),
        w(
          "happy",
          "Nous sommes heureux.",
          ["We are happy", "We’re happy"],
          "« Happy » reste identique, même lorsque plusieurs personnes sont heureuses.",
        ),
      ]),
    ],
  },
  {
    id: "u4",
    title: "Les petits riens du quotidien",
    description: "Les objets, la maison et les habitudes.",
    icon: "home",
    color: "green",
    lessons: [
      lesson("u4-l1", "Autour de moi", "Nommer les objets de tous les jours", [
        c(
          "book",
          "a book",
          "un livre",
          ["une chaise", "un sac"],
          "« A » est un article indéfini : « un » ou « une ».",
        ),
        p(
          "objects",
          [
            ["bag", "sac"],
            ["chair", "chaise"],
            ["table", "table"],
          ],
          "On dit « a bag », « a chair » et « a table ».",
        ),
        a(
          "have",
          "J’ai un livre.",
          "I have a book",
          "« Have » signifie « avoir ».",
        ),
        f(
          "article",
          "This is ___ apple. (C’est une pomme.)",
          ["an"],
          "Devant un son voyelle, « a » devient « an » : « an apple ».",
        ),
        w(
          "bag",
          "un sac",
          ["a bag"],
          "« Bag » désigne un sac. Ajoutez « a » pour dire « un sac ».",
        ),
        l(
          "book",
          "This is a book",
          "C’est un livre.",
          ["C’est une table.", "C’est un sac."],
          "« This is » sert aussi à désigner un objet.",
        ),
        c(
          "phone-object",
          "my phone",
          "mon téléphone",
          ["mon livre", "ma maison"],
          "« Phone » est la forme courante de « telephone ».",
        ),
        w(
          "have",
          "J’ai un sac.",
          ["I have a bag", "I’ve got a bag", "I have got a bag"],
          "« I have a bag » et « I’ve got a bag » expriment la possession.",
        ),
      ]),
      lesson("u4-l2", "Bienvenue chez moi", "Les pièces et les lieux", [
        c(
          "kitchen",
          "kitchen",
          "cuisine",
          ["chambre", "jardin"],
          "« Kitchen » est la pièce où l’on prépare les repas.",
        ),
        p(
          "house",
          [
            ["bedroom", "chambre"],
            ["bathroom", "salle de bains"],
            ["garden", "jardin"],
          ],
          "« Bedroom » contient « bed », qui signifie « lit ».",
        ),
        a(
          "in",
          "Le livre est dans le sac.",
          "The book is in the bag",
          "« The » désigne ici un objet précis ; « in » signifie « dans ».",
        ),
        f(
          "on",
          "The book is ___ the table. (Le livre est sur la table.)",
          ["on"],
          "« On » indique qu’un objet est sur une surface.",
        ),
        w(
          "house",
          "ma maison",
          ["my house", "my home"],
          "« House » désigne le bâtiment ; « home » le lieu où l’on vit.",
        ),
        l(
          "kitchen",
          "I am in the kitchen",
          "Je suis dans la cuisine.",
          ["Je suis dans le jardin.", "Je suis dans la chambre."],
          "« In the kitchen » signifie « dans la cuisine ».",
        ),
        c(
          "where",
          "Where is the bag?",
          "Où est le sac ?",
          ["Qu’est-ce qu’un sac ?", "Qui a un sac ?"],
          "« Where is…? » sert à demander où se trouve quelque chose.",
        ),
        w(
          "on",
          "Le livre est sur la table.",
          ["The book is on the table", "The book’s on the table"],
          "L’ordre anglais est le même ici : « The book / is / on the table ».",
        ),
      ]),
      lesson("u4-l3", "Une journée à moi", "Exprimer des habitudes simples", [
        c(
          "work",
          "I work here.",
          "Je travaille ici.",
          ["J’habite ici.", "Je mange ici."],
          "« Work » est le verbe « travailler ».",
        ),
        p(
          "verbs",
          [
            ["eat", "manger"],
            ["drink", "boire"],
            ["read", "lire"],
          ],
          "Avec « I », ces verbes gardent leur forme simple au présent.",
        ),
        a(
          "read",
          "Je lis un livre.",
          "I read a book",
          "« Read » est le verbe « lire ».",
        ),
        f(
          "drink",
          "I ___ water. (Je bois de l’eau.)",
          ["drink"],
          "« Drink » signifie « boire », et « water » signifie « eau ».",
        ),
        w(
          "work",
          "Je travaille à Paris.",
          ["I work in Paris"],
          "Comme avec « live », on emploie « in » devant la ville.",
        ),
        l(
          "every-day",
          "I read every day",
          "Je lis tous les jours.",
          ["Je bois tous les jours.", "Je lis le soir uniquement."],
          "« Every day », en deux mots, signifie « tous les jours ».",
        ),
        c(
          "like",
          "I like books.",
          "J’aime les livres.",
          ["J’ai un livre.", "Je lis ce livre."],
          "« Like » exprime ici un goût ou une préférence.",
        ),
        w(
          "like",
          "J’aime le café.",
          ["I like coffee"],
          "Pour parler du café en général, on dit « coffee », sans article.",
        ),
      ]),
    ],
  },
  {
    id: "u5",
    title: "Une table pour deux",
    description: "Commander à manger et à boire.",
    icon: "coffee",
    color: "yellow",
    lessons: [
      lesson("u5-l1", "Au café du coin", "Commander une première boisson", [
        c(
          "coffee",
          "a coffee",
          "un café",
          ["un thé", "un jus"],
          "« A coffee » désigne une tasse ou une commande de café.",
        ),
        p(
          "drinks",
          [
            ["tea", "thé"],
            ["water", "eau"],
            ["juice", "jus"],
          ],
          "L’eau se dit « water ». « Tea » et « juice » sont deux autres boissons.",
        ),
        a(
          "order",
          "Un café, s’il vous plaît.",
          "A coffee please",
          "Une commande peut être très simple : l’article, la boisson, puis « please ».",
        ),
        f(
          "order",
          "A tea, ___. (Un thé, s’il vous plaît.)",
          ["please"],
          "« Please » rend la commande plus polie.",
        ),
        w(
          "water",
          "De l’eau, s’il vous plaît.",
          ["Water please", "Some water please"],
          "On peut dire « Water, please » ou « Some water, please ».",
        ),
        l(
          "tea",
          "A tea, please",
          "Un thé, s’il vous plaît.",
          ["Un café, s’il vous plaît.", "Un jus, s’il vous plaît."],
          "Vous avez entendu « tea » : un thé.",
        ),
        c(
          "would-like",
          "I would like a coffee.",
          "Je voudrais un café.",
          ["J’aime le café.", "Je bois un café."],
          "« I would like » exprime une demande polie, différente de « I like ».",
        ),
        w(
          "would-like",
          "Je voudrais un thé.",
          ["I would like a tea", "I’d like a tea"],
          "« I’d like » est la contraction de « I would like ».",
        ),
      ]),
      lesson("u5-l2", "À table !", "Choisir un repas", [
        c(
          "bread",
          "bread",
          "pain",
          ["riz", "fromage"],
          "« Bread » est généralement indénombrable : on dit « some bread ».",
        ),
        p(
          "food",
          [
            ["rice", "riz"],
            ["cheese", "fromage"],
            ["chicken", "poulet"],
          ],
          "Ces mots permettent de comprendre des plats simples sur un menu.",
        ),
        a(
          "would-like",
          "Je voudrais du riz.",
          "I would like some rice",
          "« Some » indique une quantité non précisée de riz.",
        ),
        f(
          "menu",
          "The ___, please. (Le menu, s’il vous plaît.)",
          ["menu"],
          "« Menu » s’écrit de la même façon en français et en anglais.",
        ),
        w(
          "bread",
          "du pain",
          ["some bread", "bread"],
          "On dit « bread » ou « some bread » pour une quantité non précisée.",
        ),
        l(
          "chicken",
          "I would like chicken",
          "Je voudrais du poulet.",
          ["Je voudrais du fromage.", "Je voudrais du pain."],
          "« Chicken » signifie ici la viande de poulet.",
        ),
        c(
          "vegetarian",
          "I am vegetarian.",
          "Je suis végétarien.",
          ["J’ai faim.", "Je suis fatigué."],
          "« Vegetarian » indique que l’on ne mange pas de viande.",
        ),
        w(
          "vegetarian",
          "Je suis végétarien.",
          [
            "I am vegetarian",
            "I’m vegetarian",
            "I am a vegetarian",
            "I’m a vegetarian",
          ],
          "On peut employer « vegetarian » comme adjectif ou « a vegetarian » comme nom.",
        ),
      ]),
      lesson("u5-l3", "L’addition, please", "Demander un prix et remercier", [
        c(
          "bill",
          "The bill, please.",
          "L’addition, s’il vous plaît.",
          ["Le menu, s’il vous plaît.", "De l’eau, s’il vous plaît."],
          "« Bill » désigne l’addition, notamment en anglais britannique.",
        ),
        p(
          "payment",
          [
            ["price", "prix"],
            ["cash", "espèces"],
            ["card", "carte bancaire"],
          ],
          "« Cash » désigne l’argent liquide ; « card » permet de payer par carte.",
        ),
        a(
          "how-much",
          "Combien ça coûte ?",
          "How much is it",
          "« How much » sert à demander le prix.",
        ),
        f(
          "card",
          "Can I pay by ___? (Puis-je payer par carte ?)",
          ["card"],
          "On dit « pay by card » pour payer par carte.",
        ),
        w(
          "bill",
          "L’addition, s’il vous plaît.",
          ["The bill please", "The check please"],
          "« Bill » est courant au Royaume-Uni ; « check » est courant aux États-Unis.",
        ),
        l(
          "price",
          "It is ten euros",
          "C’est dix euros.",
          ["C’est deux euros.", "C’est vingt euros."],
          "« Ten » est dix ; « twenty » est vingt.",
        ),
        c(
          "delicious",
          "It is delicious!",
          "C’est délicieux !",
          ["C’est cher !", "C’est froid !"],
          "« Delicious » permet de dire qu’un plat est délicieux.",
        ),
        w(
          "thanks",
          "Merci beaucoup.",
          [
            "Thank you very much",
            "Thanks a lot",
            "Many thanks",
            "Thank you so much",
          ],
          "Ces expressions renforcent un remerciement.",
        ),
      ]),
    ],
  },
  {
    id: "u6",
    title: "Le monde vous attend",
    description: "Voyager et trouver son chemin.",
    icon: "compass",
    color: "purple",
    lessons: [
      lesson("u6-l1", "En route", "Les premiers mots du voyage", [
        c(
          "station",
          "train station",
          "gare ferroviaire",
          ["aéroport", "hôtel"],
          "« Train station » désigne la gare ferroviaire.",
        ),
        p(
          "travel",
          [
            ["airport", "aéroport"],
            ["ticket", "billet"],
            ["bus", "bus"],
          ],
          "Un « ticket » est un billet de transport.",
        ),
        a(
          "ticket",
          "Un billet, s’il vous plaît.",
          "A ticket please",
          "« A ticket, please » est une demande de billet simple et polie.",
        ),
        f(
          "station",
          "Where is the ___? (Où est la gare ferroviaire ? Un seul mot.)",
          ["station"],
          "Dans le contexte ferroviaire, « station » peut désigner la gare.",
        ),
        w(
          "airport",
          "l’aéroport",
          ["the airport"],
          "« Airport » assemble « air » et « port ».",
        ),
        l(
          "bus",
          "Where is the bus?",
          "Où est le bus ?",
          ["Où est l’hôtel ?", "Combien coûte le billet ?"],
          "« Where is » demande où se trouve le bus.",
        ),
        c(
          "ticket-two",
          "Two tickets, please.",
          "Deux billets, s’il vous plaît.",
          ["Un billet, s’il vous plaît.", "Dix billets, s’il vous plaît."],
          "Avec « two », « ticket » prend un « s ».",
        ),
        w(
          "ticket-two",
          "Deux billets, s’il vous plaît.",
          ["Two tickets please"],
          "Le nombre précède le nom au pluriel : « two tickets ».",
        ),
      ]),
      lesson(
        "u6-l2",
        "Par ici ou par là ?",
        "Demander et comprendre une direction",
        [
          c(
            "left",
            "Turn left.",
            "Tournez à gauche.",
            ["Tournez à droite.", "Allez tout droit."],
            "« Turn » signifie « tourner », et « left » signifie « gauche ».",
          ),
          p(
            "directions",
            [
              ["left", "gauche"],
              ["right", "droite"],
              ["straight ahead", "tout droit"],
            ],
            "Ces trois indications suffisent à comprendre un itinéraire simple.",
          ),
          a(
            "where-hotel",
            "Où est l’hôtel ?",
            "Where is the hotel",
            "« Where is » est suivi du lieu que vous cherchez.",
          ),
          f(
            "right",
            "Turn ___. (Tournez à droite.)",
            ["right"],
            "« Right » signifie « droite » dans une indication de direction.",
          ),
          w(
            "excuse-me",
            "Excusez-moi.",
            ["Excuse me"],
            "« Excuse me » attire poliment l’attention, par exemple pour demander son chemin.",
          ),
          l(
            "straight",
            "Go straight ahead",
            "Allez tout droit.",
            ["Tournez à gauche.", "Faites demi-tour."],
            "« Straight ahead » signifie « tout droit ».",
          ),
          c(
            "near",
            "The hotel is near the station.",
            "L’hôtel est près de la gare.",
            ["L’hôtel est dans la gare.", "L’hôtel est loin de la gare."],
            "« Near » signifie « près de ».",
          ),
          w(
            "left",
            "Tournez à gauche.",
            ["Turn left"],
            "À l’impératif, on commence directement par le verbe : « Turn left ».",
          ),
        ],
      ),
      lesson("u6-l3", "Bienvenue ailleurs", "À l’hôtel et en cas de besoin", [
        c(
          "reservation",
          "I have a reservation.",
          "J’ai une réservation.",
          ["Je cherche la gare.", "Je voudrais un repas."],
          "« Reservation » désigne une réservation, par exemple à l’hôtel.",
        ),
        p(
          "hotel",
          [
            ["room", "chambre d’hôtel"],
            ["key", "clé"],
            ["help", "aide"],
          ],
          "« Room » est la chambre ; « key » permet d’y entrer.",
        ),
        a(
          "reservation",
          "J’ai une réservation.",
          "I have a reservation",
          "On utilise « have » pour dire que l’on a une réservation.",
        ),
        f(
          "help",
          "Can you ___ me? (Pouvez-vous m’aider ?)",
          ["help"],
          "« Can you help me? » est une demande d’aide utile en voyage.",
        ),
        w(
          "understand",
          "Je ne comprends pas.",
          ["I do not understand", "I don’t understand"],
          "Pour une négation au présent avec « understand », on ajoute « do not » ou « don’t ».",
        ),
        l(
          "help",
          "Can you help me?",
          "Pouvez-vous m’aider ?",
          ["Pouvez-vous partir ?", "Voulez-vous un thé ?"],
          "« Help me » signifie « m’aider ».",
        ),
        c(
          "repeat",
          "Can you repeat, please?",
          "Pouvez-vous répéter, s’il vous plaît ?",
          [
            "Pouvez-vous payer, s’il vous plaît ?",
            "Pouvez-vous tourner, s’il vous plaît ?",
          ],
          "« Repeat » signifie « répéter ». Vous pouvez demander à entendre une phrase à nouveau.",
        ),
        w(
          "help",
          "Pouvez-vous m’aider ?",
          ["Can you help me", "Could you help me"],
          "« Can you…? » et « Could you…? » permettent de demander de l’aide poliment.",
        ),
      ]),
    ],
  },
];
export const lessons = course.flatMap((unit) => unit.lessons);
export const exercises = lessons.flatMap((item) => item.exercises);
export const lessonById = new Map(lessons.map((item) => [item.id, item]));
export const exerciseById = new Map(exercises.map((item) => [item.id, item]));
export function isUnlocked(id: string, completed: string[]) {
  const index = lessons.findIndex((item) => item.id === id);
  return (
    index >= 0 && (index === 0 || completed.includes(lessons[index - 1].id))
  );
}
export function nextLesson(completed: string[]) {
  return lessons.find((item) => !completed.includes(item.id)) ?? null;
}
