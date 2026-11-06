# Ouvrir Parlio avec Vercel Hobby et Turso Free

Le parcours principal utilise **Vercel Hobby** pour ce projet personnel et **Turso Free** pour la base. Aucun service payant n’est créé par les fichiers du dépôt. Choisir uniquement les offres gratuites, dans leurs limites et conditions d’utilisation. Le compte Render testé a demandé une carte même avec Free sélectionné ; la configuration Vercel évite ce parcours.

Le nouveau design et les trois langues utilisent ces mêmes variables de base. Les abonnements sont en mode test par défaut, le mode réel exige une activation distincte et l’IA reste désactivée sur cette publication. Voir [ACTIVATION.md](ACTIVATION.md) pour les branchements séparés. Vercel Hobby est destiné à un usage personnel non commercial : ne pas y lancer des abonnements payants.

Une publication Codex ne crée pas de site. Une importation Vercel peut afficher « Ready » alors que la connexion à la base reste à configurer : il faut vérifier l’application sur son adresse publique.

## 1. Créer la base gratuite

1. Ouvrir [Turso](https://app.turso.tech/) et créer un compte, par exemple avec GitHub. Choisir l’offre gratuite.
2. Créer une base dédiée nommée `parlio`, de préférence dans une région européenne.
3. Récupérer son **Database URL** (`libsql://…turso.io` ou `https://…turso.io`).
4. Créer un **jeton d’accès à cette base**, avec les droits de lecture et d’écriture. Ce jeton sera utilisé uniquement par le serveur.

**Ne pas envoyer ce jeton dans le chat, le navigateur de Parlio ou GitHub.** Il doit être saisi directement dans les variables privées de l’hébergeur, à l’étape suivante. Ne pas utiliser un jeton d’administration de tout le compte Turso. Prévoir de renouveler le jeton avant sa date d’expiration, s’il en a une.

## 2. Activer le projet sur Vercel

Si le projet est déjà importé, le conserver : inutile d’en créer un autre. Le nouveau code doit être déployé depuis la branche `main`.

Pour une première importation : ouvrir [Vercel](https://vercel.com/new), choisir **Hobby / projet personnel**, connecter GitHub et importer `kev28800/parlio`. Le framework est **Vite**, la compilation et le dossier `dist` sont déclarés dans `vercel.json`. Node.js est fixé à **24.x** par `package.json`.

Dans le projet Vercel, ouvrir **Settings → Environment Variables**, puis ajouter :

| Name / Key            | Value                                           |
| --------------------- | ----------------------------------------------- |
| `DATABASE_URL`        | La valeur **Database URL** de votre base Turso  |
| `DATABASE_AUTH_TOKEN` | Le jeton privé **Read & Write** créé dans Turso |

Le nom `DATABASE_AUTH_TOKEN` va dans la colonne du nom. Le jeton privé va seulement dans la valeur. Ne pas mettre le jeton dans le nom de variable. Enregistrer pour l’environnement **Production** et aussi **Preview** si les aperçus doivent fonctionner. Les réglages publics des cookies et du proxy sont déjà dans `vercel.json`.

Après un changement de variable, redéployer **la version la plus récente de la branche `main`**, dans **Deployments**. Redéployer un ancien commit ne récupère pas automatiquement le code récent. Une modification de variable seule ne corrige pas une version déjà construite.

Ouvrir ensuite l’adresse HTTPS de **Production** affichée dans **Domains**, ou le bouton **Visit**. Cette adresse est celle de Parlio. Le nom exact est attribué par Vercel et n’est pas supposé à l’avance.

La fonction Node `api/index.ts` sert les appels `/api/*`. L’interface et ses ressources sont servies séparément depuis `dist`. Une initialisation partagée et les transactions de la base préservent la progression entre les démarrages de fonctions. Aucun disque temporaire Vercel n’est utilisé pour sauvegarder les comptes.

## Ce que cette configuration conserve

Le serveur est compilé et s’exécute avec Node.js 24 et les seules dépendances de production. Le contrôle `/api/health` vérifie la base sans créer d’utilisateur. Les transactions protègent les réponses et les récompenses, y compris quand des requêtes arrivent en même temps. L’absence de la base externe empêche le démarrage, au lieu d’enregistrer silencieusement les données sur un disque temporaire.

Une fois la configuration activée, les comptes et la progression sont dans Turso, indépendamment des démarrages et arrêts des fonctions Vercel. Le jeton n’est jamais envoyé au navigateur. Les données d’essai de l’environnement Codex ne sont pas publiées : le site commence avec sa propre base vide.

Les autres réglages sont déjà présents dans `vercel.json` : cookies sécurisés, en-têtes de sécurité et proxy de l’hébergeur. Ne pas modifier ces réglages pour résoudre un problème de connexion sans diagnostic.

## Limites des offres gratuites

- Les fonctions Vercel peuvent démarrer à froid. Un écran de chargement ou de nouvelle tentative est prévu.
- Le fonctionnement reste soumis aux quotas et à la disponibilité de Vercel et de Turso. Aucun achat automatique n’est activé par le code.
- L’offre gratuite ne remplace pas un plan de sauvegarde : prévoir des exports et une restauration vérifiée pour des données importantes.
- La vérification d’e-mail et la récupération de mot de passe ne sont pas encore intégrées. Le contenu pédagogique doit être relu avant commercialisation.

## Vérifier l’adresse obtenue

Sur **l’adresse HTTPS réellement attribuée par Vercel** :

1. Vérifier que `/api/health` renvoie `{"status":"ok","service":"parlio"}`.
2. Terminer une leçon, créer un compte de test, se déconnecter et se reconnecter.
3. Redéployer la version actuelle depuis Vercel, puis vérifier que la progression revient.
4. Supprimer le compte de test dans le profil.

Les tests locaux, même avec le pilote libSQL, ne prouvent pas qu’un compte Turso réel est connecté ou qu’une adresse publique est déjà créée.

## Alternative avec Docker

Le `Dockerfile` est aussi fourni pour un autre hébergeur, sans obliger à en utiliser un payant. L’image s’exécute avec un utilisateur non privilégié et ne contient ni base locale ni secret. Fournir `DATABASE_URL`, `DATABASE_AUTH_TOKEN` et `REQUIRE_REMOTE_DATABASE=true` au processus pour le stockage distant. Le disque SQLite local est toujours disponible pour le développement ou pour un serveur possédant un volume persistant.

```bash
docker build -t parlio .
```

Dans le cloud Codex, passer le certificat du proxy par un secret BuildKit si nécessaire :

```bash
docker build --secret id=proxy_ca,src="$CODEX_PROXY_CERT" -t parlio .
```

Le certificat n’est pas copié dans l’image et la vérification TLS reste activée.

## Autre parcours Render

Le fichier `render.yaml` et le Dockerfile restent disponibles pour une installation Render. Ce parcours a demandé des informations de carte pour le compte essayé ; il n’est plus la recommandation pour une ouverture sans saisie de carte. Aucun abonnement Render n’est activé par ce dépôt.
