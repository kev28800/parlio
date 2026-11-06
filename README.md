# Parlio

**Un petit pas, un nouveau monde.** Apprentissage de l’anglais, de l’espagnol et de l’allemand pour francophones. Univers sombre et coloré, menu de jeu, leçons de cinq minutes et révisions espacées.

## Lancer l’application

Prérequis : **Node.js 24.x**, npm et un navigateur récent.

```bash
cd /workspace/parlio
npm ci
npm run dev
```

Le serveur écoute sur **3000** et sert l’API Express et React/Vite. Les polices sont locales. Sur une machine distante, utiliser son aperçu ou un transfert de port : `localhost` sur votre ordinateur ne désigne pas l’environnement cloud.

Les leçons gratuites ne nécessitent aucun service IA ni compte Stripe. SQLite conserve les données dans `data/parlio.sqlite`, ignoré par Git. Ne pas effacer ce dossier pour préserver les progrès locaux. Avec `DATABASE_URL` et `DATABASE_AUTH_TOKEN`, le serveur utilise Turso/libSQL. Un cookie conserve l’essai trente jours ; un compte permet de retrouver ses progrès sur un autre appareil.

```bash
npm run build
npm start
```

Le serveur de production est compilé dans `build/server/index.mjs`, sans dépendances de développement. Utiliser HTTPS et une base persistante. Pour un contrôle strictement local en HTTP : `COOKIE_SECURE=false npm start`.

[Déploiement](DEPLOIEMENT.md) · [Activation Stripe de test et tuteur IA](ACTIVATION.md)

## Fonctions

- Camp de base avec accès à l’aventure, aux révisions, à la collection et au tuteur. Les trois langues sont des mondes dont la progression reste indépendante.
- Carte des six unités avec niveaux verrouillés ou disponibles, étoiles correspondant aux leçons terminées, missions quotidiennes calculées sur les séances réelles. Un niveau de jeu correspond à 120 XP ; il ne représente pas une certification linguistique.

- Trois parcours indépendants : **6 unités × 3 leçons × 8 exercices par langue**, soit **54 leçons et 432 exercices**. Les identifiants et progrès anglais de la version précédente restent compatibles.
- Six formats : choix, paires, reconstruction, mot manquant, écrit et écoute. Consignes et explications en français ; variantes acceptées explicitement.
- Choix de langue, reprise, déblocage progressif, correction immédiate et bilan. Une erreur ne bloque pas la fin d’une leçon.
- Révisions par langue : notions dues puis fragiles, carnet et historique. Une erreur rapproche la révision à dix minutes ; les réussites espacées d’au moins vingt heures donnent des intervalles de 1, 3, 7, 14 puis 30 jours. Cette règle simple ne constitue pas une promesse d’efficacité scientifique.
- XP et série communs aux langues, calculés à partir de séances réelles. Les minutes sont une durée pédagogique indicative, créditée en fin de séance, sans chronométrage.
- Comptes, transfert de l’essai, connexion, déconnexion, export des progrès de toutes les langues et des conversations, suppression du compte.
- Objectif de 5, 10 ou 15 minutes, fuseau horaire, audio facultatif, réduction des animations, téléphone et ordinateur, clavier et dialogues natifs.
- Pip à l’oral : renard illustré en 3D, lecture dans la langue choisie et dictée facultative du navigateur. Pratique guidée accessible sans API IA, avec 36 phrases issues de chaque parcours ; comparaison des textes, sans note de prononciation ni XP. Le micro nécessite un accord et un clic, s’arrête après 20 secondes, en quittant la page ou en passant au clavier. Une transcription IA est relue et envoyée manuellement ; les réponses peuvent être écoutées avec Pip.
- Premium : Stripe Checkout, notifications signées, droits côté serveur, portail client, bilan par unité et sur trente jours. Prix vérifiés : 10,99 €/mois ou 69,99 €/an. Mode test par défaut ; mode réel conditionné à une configuration explicite et un hébergement commercial. Sans configuration, le paiement est désactivé.
- Tuteur IA de conversation avec OpenAI Responses, explications en français et exemples dans la langue choisie. Consentement explicite, conversations privées par langue, effacement et quotas persistants. Sans clé, aucune réponse fictive n’est affichée.
- Séance IA de quatre exercices préparée à la demande, une par langue et journée UTC : format validé, correction côté serveur, reprise et XP idempotents. Ces exercices restent distincts du carnet éditorial.

L’IA nécessite un budget API distinct d’un abonnement ChatGPT. Aucun encaissement, crédit API ni hébergement payant n’est activé par le dépôt. Les cours gratuits restent disponibles sans ces services.

## Configuration

Fournir les variables au processus : aucun fichier `.env` n’est chargé automatiquement. Les secrets vont uniquement dans les réglages privés de l’hébergeur.

| Variable                  | Défaut               | Rôle                                                            |
| ------------------------- | -------------------- | --------------------------------------------------------------- |
| `PORT`                    | `3000`               | Port du serveur                                                 |
| `DATABASE_PATH`           | `data/parlio.sqlite` | Base locale                                                     |
| `DATABASE_URL`            | absente              | Adresse HTTPS/libsql Turso                                      |
| `DATABASE_AUTH_TOKEN`     | absent               | Jeton privé de la base                                          |
| `REQUIRE_REMOTE_DATABASE` | absent               | `true` refuse le stockage temporaire si la base distante manque |
| `TRUST_PROXY_HOPS`        | `0`                  | `1` derrière le proxy fiable de l’hébergeur                     |
| `COOKIE_SECURE`           | actif en production  | Cookies réservés à HTTPS                                        |
| `CHROMIUM_PATH`           | `/usr/bin/chromium`  | Navigateur de test                                              |

Les variables `STRIPE_TEST_*`, `PUBLIC_APP_URL` et `PARLIO_AI_*` sont détaillées dans [ACTIVATION.md](ACTIVATION.md). Ne jamais les préfixer avec `VITE_`, qui les exposerait au navigateur. Vercel conserve les octets bruts nécessaires à la signature Stripe avec `NODEJS_HELPERS=0`.

L’environnement cloud est déjà isolé : réutiliser ce checkout sans créer de worktree supplémentaire.

## Organisation

```text
shared/
  course.ts                    # Anglais et identifiants historiques
  spanish.ts, german.ts        # Autres contenus éditoriaux
  multilingual-content.ts      # Construction des six formats
  courses.ts                   # Registre et progression par langue
  learning.ts                  # Correction, révisions, dates
  types.ts, billing.ts, ai.ts   # Contrats partagés
server/
  app.ts                       # API, comptes, séances, statistiques
  billing.ts                   # Stripe de test et droits
  ai.ts                        # OpenAI, quotas et conversations
  database.ts                  # Transactions SQLite / Turso
  index.ts, serverless.ts       # Serveur local / fonction Vercel
  netlify.ts                   # Adaptateur Netlify compatible avec les notifications signées
api/index.ts                   # Entrée Vercel
src/
  Website.tsx, site.css         # Accueil public et direction visuelle
  App.tsx, curriculum.ts        # Navigation, état, choix de langue
  Dashboard.tsx, Views.tsx      # Niveaux, révisions et profil
  GameHub.tsx, WorldPicker.tsx  # Menu de jeu, missions et choix des mondes
  game.css                     # Thème sombre, couleurs et adaptation mobile
  Lesson.tsx                   # Exercices, audio et bilan
  Premium.tsx, Insights.tsx     # Paiement de test et bilan
  Tutor.tsx                    # Conversation et pratique IA
  Account.tsx, ui.tsx           # Comptes, démarrage et dialogues
```

## Contenu et intégrité

Les réponses écrites sont des listes explicites. La correction normalise casse, espaces, apostrophes et ponctuation, en conservant les diacritiques. Elle n’utilise pas de correspondance approximative acceptant une négation ou une autre personne. Conserver les identifiants et concepts publiés.

Les réponses, déblocages et récompenses sont validés côté serveur avec Zod. Les transactions protègent les validations simultanées et les récompenses répétées. Les solutions d’une séance générée restent côté serveur jusqu’à la correction. Les cours éditoriaux sont publics.

Les mots de passe utilisent `scrypt` et un sel aléatoire. Les sessions aléatoires sont hachées en base, dans un cookie `HttpOnly`, `SameSite=Lax`, `Secure` en production. Les mutations ordinaires vérifient l’origine et un en-tête dédié. Stripe possède une route indépendante avec signature officielle et vérification du mode configuré. L’URL de retour de Checkout n’accorde aucun abonnement.

Les quotas IA par compte et globaux sont réservés en base avant l’appel, y compris en concurrence. Les échecs sont comptés et les demandes terminées répétées ne rappellent pas le modèle. Aucun outil ni accès Web n’est accordé au tuteur. Le navigateur ne choisit ni clé, ni modèle, ni droits.

**Les trois cours originaux doivent être relus par des spécialistes des langues concernées avant commercialisation.** Aucune certification de niveau ou de prononciation n’est annoncée. Une réponse IA peut comporter une erreur pédagogique.

## Vérifications

```bash
npm test
npm run test:libsql
npm run build
npm run test:e2e
```

Les tests couvrent les cours via l’API, les anciens progrès, la séparation des langues et comptes, les transactions, les droits Premium, les signatures et l’ordre des notifications Stripe, les quotas et l’effacement des conversations IA. Stripe et le modèle sont simulés : aucun appel payant n’est effectué.

Le pilote libSQL utilise une base locale de test : il ne prouve pas une connexion à un compte Turso réel. Playwright utilise Chromium et un serveur indépendant sur **3100**, parcourt les formats et le nouveau site, contrôle les débordements et recherche des violations WCAG 2 A/AA et 2.1 AA avec axe. Ces contrôles ne constituent pas une certification d’accessibilité.

Les tests de Pip simulent les services vocaux du navigateur : consentement et clic avant le micro, refus, délai maximal, arrêt à la navigation, trois langues et envoi manuel vers un modèle simulé. Ils ne valident pas un microphone réel ni la disponibilité d’une voix sur chaque appareil. L’illustration de Pip est animée par l’interface ; elle ne fournit pas une synchronisation des lèvres.

## Limites

- Lecture et dictée selon les fonctions et voix disponibles dans le navigateur, sous HTTPS ; le clavier reste accessible en secours. La dictée peut utiliser le service en ligne du navigateur. Échanges vocaux par tours avec envoi explicite, sans OpenAI Realtime ni score de prononciation.
- Pas encore de vérification d’e-mail ou de récupération de mot de passe. La limitation des connexions reste en mémoire ; prévoir une limitation partagée pour plusieurs instances.
- Sauvegardes, restauration, conservation et informations légales à adapter au responsable du service.
- Paiements réels désactivés par défaut ; activation explicite après configuration de Stripe et de l’hébergement commercial. **Vercel Hobby est réservé à un usage personnel non commercial** : vendre un abonnement nécessite un hébergement adapté et un travail distinct sur les paiements et les obligations du vendeur.
- Les tests ne valident ni les identifiants privés des fournisseurs ni la qualité d’une réponse de modèle réel. Voir [ACTIVATION.md](ACTIVATION.md) pour l’activation.
