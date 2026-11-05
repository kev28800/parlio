# Parlio

**Un petit pas, un nouveau monde.** Une première application d’anglais débutant pour francophones, avec des leçons de cinq minutes et Pip, un compagnon renard original.

## Lancer l’application

Prérequis : **Node.js 24.x**, npm et un navigateur récent. Aucun compte de service externe ni clé API n’est nécessaire.

```bash
cd /workspace/parlio
npm ci
npm run dev
```

Le serveur de développement écoute sur le port **3000**, sur toutes les interfaces. Il sert à la fois l’API Express et l’interface React/Vite. Les modifications du serveur entraînent son redémarrage ; Vite actualise l’interface. Les polices sont servies localement.

Par défaut, les données sont conservées dans `data/parlio.sqlite` (SQLite, non suivi par Git). Fermer le navigateur ou redémarrer le serveur ne les efface pas. Ne supprimez pas ce dossier pour conserver la progression. Avec `DATABASE_URL` et `DATABASE_AUTH_TOKEN`, la sauvegarde utilise une base distante Turso/libSQL. Un essai est lié à un cookie de session valable 30 jours ; créer un compte permet de retrouver la progression depuis un autre navigateur connecté au même serveur.

### Version de production

Pour créer une adresse Web publique, consulter [le guide de déploiement gratuit](DEPLOIEMENT.md). Une configuration Vercel Hobby avec stockage distant Turso est fournie, ainsi que des alternatives Render et Docker ; aucun hébergement n’est activé par leur seule présence. Créer les comptes gratuits chez ces fournisseurs est nécessaire pour obtenir une adresse publique.

```bash
npm run build
npm start
```

En production, utilisez **HTTPS** et une base distante persistante, ou un volume persistant si vous choisissez SQLite local. Les cookies sont `Secure` par défaut. Pour un contrôle **strictement local en HTTP**, utilisez `COOKIE_SECURE=false npm start` ; ne conservez pas cette exception lors d’une exposition publique. Les ressources de l’interface sont servies depuis `dist/` avec une politique CSP. Le serveur compilé dans `build/server/` fonctionne sans les dépendances de développement.

Variables facultatives, à fournir au processus (aucun fichier `.env` n’est chargé automatiquement) :

| Variable                  | Valeur par défaut                                 | Utilité                                                                   |
| ------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------- |
| `PORT`                    | `3000`                                            | Port du serveur                                                           |
| `DATABASE_PATH`           | `data/parlio.sqlite` dans le dossier de lancement | Chemin d’une base persistante                                             |
| `DATABASE_URL`            | non défini                                        | URL HTTPS/libsql d’une base Turso ; remplace le stockage local            |
| `DATABASE_AUTH_TOKEN`     | non défini                                        | Jeton privé de la base distante, réservé au serveur                       |
| `REQUIRE_REMOTE_DATABASE` | non défini                                        | `true` empêche le stockage temporaire si la configuration distante manque |
| `TRUST_PROXY_HOPS`        | `0`                                               | `1` uniquement derrière le proxy fiable de l’hébergeur                    |
| `COOKIE_SECURE`           | activé en production, désactivé en développement  | Cookies réservés à HTTPS                                                  |
| `CHROMIUM_PATH`           | `/usr/bin/chromium`                               | Navigateur utilisé par les tests Playwright                               |

Lancez les commandes depuis la racine du dépôt. L’environnement cloud est déjà isolé : réutilisez ce checkout ; aucun worktree supplémentaire n’est nécessaire.

## Ce qui fonctionne

- Personnalisation initiale : niveau estimé, motivation et objectif de 5, 10 ou 15 minutes. Les mêmes bases sont proposées à tous, sans prétendre à un placement de niveau.
- Accueil avec prochaine leçon, reprise d’une séance interrompue, XP, série et objectif quotidien.
- **6 unités × 3 leçons × 8 exercices = 144 exercices** : traduction à choix, associations, phrase à reconstruire, mot manquant, traduction écrite et écoute.
- Une question à la fois, correction et explication immédiates, bilan et possibilité de refaire les leçons. Une erreur ne bloque jamais la suite.
- Révisions avec priorité aux notions dues puis fragiles ; carnet, filtres, historique de pratique et prochaine date.
- Progression, XP, badges et journées calculés à partir de données réelles. Les minutes sont une durée pédagogique **indicative**, créditée à la fin d’une séance, et non un chronométrage.
- Comptes e-mail/mot de passe, transfert de l’essai à l’inscription, connexion depuis plusieurs appareils, déconnexion, export de progression et suppression définitive du compte et de ses données.
- Réglages de l’audio, du fuseau horaire et des animations ; adaptation téléphone, tablette et ordinateur ; navigation clavier et dialogues natifs avec gestion du focus.
- Présentation d’une future offre Premium : **6,99 €/mois ou 49,99 €/an**, hypothèses modifiables. Le parcours et les révisions restent gratuits. Aucun paiement n’est simulé.

## Organisation du code

```text
shared/
  course.ts       # Contenu éditorial : unités, leçons, variantes, explications
  learning.ts     # Correction, révision espacée, jours et séries
  types.ts        # Contrats partagés
server/
  app.ts          # API, validation, sessions, comptes, stockage SQLite
  index.ts        # Serveur Vite / ressources de production
src/
  App.tsx         # Navigation, état courant, structure responsive
  Dashboard.tsx   # Accueil et étapes de leçons
  Lesson.tsx      # Exercices, audio et bilan
  Views.tsx       # Parcours, carnet de révision, profil
  Account.tsx     # Démarrage, inscription, connexion, offre future
  ui.tsx          # Pip, marque, dialogues et indicateurs
  styles.css      # Identité visuelle, responsive et accessibilité
tests/
  learning.test.ts  # Contenu, correction, fuseaux, séries et intervalles
  api.test.ts       # Parcours complet, idempotence, comptes et persistance
  browser/         # Scénarios Playwright et contrôles axe
```

### Modifier le contenu

Éditez `shared/course.ts`. Chaque leçon possède un identifiant stable et huit exercices. Les petits constructeurs `c`, `p`, `a`, `f`, `w`, `l` décrivent respectivement un choix, des paires, une reconstruction, un mot à compléter, une réponse écrite et une écoute. Ils portent tous une notion et une explication. Les réponses écrites acceptables sont des listes explicites : ajoutez une variante uniquement si elle conserve le sens.

La correction normalise casse, espaces, apostrophes typographiques et ponctuation. Elle n’utilise pas de correspondance approximative qui pourrait accepter une négation ou une autre personne. La validation définitive se fait côté serveur. Les contenus sont publics : leur présence dans le code de l’interface n’accorde aucun droit à modifier les récompenses du serveur.

Conservez les identifiants des leçons, exercices et notions déjà pratiqués pour que la progression reste cohérente. Des changements structurels futurs demanderont des migrations. L’architecture sépare le contenu et la présentation pour permettre d’autres cours ; **seul le cours français → anglais est livré**.

**Ce contenu original d’initiation doit être relu par une personne compétente en enseignement de l’anglais avant publication commerciale. Aucun niveau officiel ou certification n’est annoncé.**

### Règle de révision

Pour chaque notion : tentatives, réussites, erreurs, dernière pratique, prochaine révision et intervalle sont enregistrés. Une erreur prévoit une révision dans **10 minutes** et remet la série de réussites à zéro. Les réussites espacées d’au moins **20 heures** donnent des intervalles de **1, 3, 7, 14 puis 30 jours**. Les réussites immédiates n’allongent pas l’intervalle. Les séances de révision comprennent jusqu’à huit notions déjà rencontrées ; réviser en avance reste possible. Cette règle simple n’est pas présentée comme un algorithme scientifiquement validé.

### Intégrité et comptes

Les réponses, les droits d’accès aux leçons et les récompenses sont validés sur le serveur avec Zod. Chaque séance a un identifiant persistant et un curseur. Réenvoyer une réponse ou la dernière validation ne crée ni nouvelle tentative ni seconde récompense ; des transactions SQLite rendent l’écriture de la réponse et de la notion atomique. Une nouvelle séance volontaire d’une leçon peut, elle, gagner des XP.

Les mots de passe sont hachés avec `scrypt` et un sel aléatoire. Les jetons de session aléatoires sont hachés dans la base et placés dans un cookie `HttpOnly`, `SameSite=Lax`, `Secure` en production. L’inscription et la connexion renouvellent la session. Chaque lecture ou modification d’une séance est limitée au propriétaire authentifié. Les mutations exigent un en-tête dédié et une origine cohérente ; les connexions sont limitées en fréquence. Supprimer un compte efface par cascade ses sessions, notions et séances. Aucun secret n’est placé dans le navigateur.

## Vérifications

```bash
npm test
npm run test:libsql
npm run build
npm run test:e2e
```

Les tests serveur utilisent une base temporaire et un port aléatoire. Ils exécutent notamment **les 18 leçons puis une révision**, simulent un redémarrage avec la même base, vérifient les récompenses répétées, la rotation des sessions, l’isolation de deux comptes, la suppression en cascade et les requêtes intersites.

`npm run test:libsql` exécute aussi les tests de l’API avec le pilote libSQL et une base de test locale. Les transactions concurrentes, leur annulation et le refus d’une configuration distante invalide sont couverts. Cela ne valide pas une connexion à un compte Turso réel : cette vérification nécessite sa configuration effective.

Les tests navigateur démarrent un serveur séparé sur **3100** avec une base dans `/tmp/parlio-browser-tests.sqlite`. Ils parcourent les six formats, une erreur et sa correction, une reprise après rechargement, l’inscription, les réglages, les états vides et une panne réseau. Ils contrôlent l’absence de débordement horizontal et recherchent des violations WCAG 2 A/AA et 2.1 AA avec axe. Ces contrôles automatisés ne constituent pas une certification d’accessibilité.

Chromium doit être installé ; adaptez `CHROMIUM_PATH` si nécessaire. Aucun utilisateur ni classement fictif n’est affiché dans le produit.

## Limites et branchements avant une ouverture publique

- **Audio** : voix anglaise du navigateur, déclenchée uniquement par l’utilisateur. Sans voix disponible, si l’audio est désactivé ou si la lecture échoue, une transcription explicite permet de continuer. Pas de reconnaissance vocale ni de score de prononciation.
- **Comptes** : authentification locale opérationnelle, sans fournisseur externe. Vérification d’e-mail et récupération de mot de passe non implémentées ; un service d’e-mail transactionnel et les flux correspondants devront être ajoutés pour ces fonctions. Aucune fausse confirmation d’e-mail n’est envoyée.
- **Exploitation** : instance Node unique avec SQLite local ou Turso/libSQL. La configuration principale utilise Vercel Hobby et une base Turso gratuite externe. Les offres sont soumises aux conditions et quotas des fournisseurs. Prévoir HTTPS, sauvegardes, politique de conservation, surveillance et restauration vérifiée avant d’héberger des données importantes. La limitation des connexions est en mémoire et se réinitialise au redémarrage ; un déploiement multi-instance nécessitera une limitation partagée.
- **Premium** : écran d’information seulement. Paiement, droits Premium, statistiques avancées, cours supplémentaires et conversation IA ne sont pas implémentés. Aucun compte Stripe ni clé IA n’est nécessaire pour cette version.
- **Pédagogie et publication** : relecture éditoriale et pédagogique à réaliser, informations légales à adapter au responsable du service. L’application n’a pas été déployée sur un hébergement public.

Le cœur du produit fonctionne sans service externe. Aucune clé ni valeur secrète n’est à saisir pour l’essayer dans cet environnement.
