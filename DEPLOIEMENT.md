# Ouvrir Parlio avec une adresse Web — offres gratuites

Le code est préparé pour **Render Free** (l’application) et **Turso Free** (les comptes et la progression). Aucune offre payante ni disque payant n’est déclaré. Ces services imposent des quotas et peuvent modifier leurs offres : choisir uniquement les plans gratuits, sans activer de facturation ou de dépassement payant.

Publier l’environnement Codex sauvegarde le projet ; cela ne crée pas un site public. L’adresse du site n’existera qu’après l’activation des deux services ci-dessous. Leurs comptes doivent être créés par vous ; aucun compte ou abonnement n’est créé en votre nom par ces fichiers.

## 1. Créer la base gratuite

1. Ouvrir [Turso](https://app.turso.tech/) et créer un compte, par exemple avec GitHub. Choisir l’offre gratuite.
2. Créer une base dédiée nommée `parlio`, de préférence dans une région européenne.
3. Récupérer son **Database URL** (`libsql://…turso.io` ou `https://…turso.io`).
4. Créer un **jeton d’accès à cette base**, avec les droits de lecture et d’écriture. Ce jeton sera utilisé uniquement par le serveur.

**Ne pas envoyer ce jeton dans le chat, le navigateur de Parlio ou GitHub.** Il doit être saisi directement dans les variables privées de l’hébergeur, à l’étape suivante. Ne pas utiliser un jeton d’administration de tout le compte Turso. Prévoir de renouveler le jeton avant sa date d’expiration, s’il en a une.

## 2. Activer le site gratuit

Ouvrir [l’installation Render de Parlio](https://render.com/deploy?repo=https://github.com/kev28800/parlio).

1. Créer un compte Render, par exemple avec GitHub, et autoriser l’accès au dépôt `kev28800/parlio` si nécessaire.
2. Utiliser le Blueprint `render.yaml` du dépôt. Vérifier que le service indique **Free** et qu’aucun disque ou autre service payant n’est ajouté.
3. Renseigner les deux valeurs demandées :

   | Champ Render          | Valeur à saisir                   |
   | --------------------- | --------------------------------- |
   | `DATABASE_URL`        | L’URL de la base créée chez Turso |
   | `DATABASE_AUTH_TOKEN` | Le jeton privé de cette base      |

4. Lancer le déploiement gratuit et attendre la fin de la compilation et du démarrage.
5. **Cliquer sur l’adresse HTTPS affichée pour le service Render. C’est l’adresse de Parlio.** Elle s’ouvre normalement sur téléphone ou ordinateur ; il n’est plus nécessaire d’utiliser `localhost`.

Le nom de domaine exact est attribué par Render et n’est pas supposé à l’avance. Si un écran demande de souscrire une offre payante, ne pas confirmer : revenir vérifier le plan choisi. Le compte, les quotas et les conditions de gratuité doivent être vérifiés directement chez chaque fournisseur.

## Ce que cette configuration conserve

Le serveur est compilé et s’exécute avec Node.js 24 et les seules dépendances de production. Le contrôle `/api/health` vérifie la base sans créer d’utilisateur. Les transactions protègent les réponses et les récompenses, y compris quand des requêtes arrivent en même temps. L’absence de la base externe empêche le démarrage, au lieu d’enregistrer silencieusement les données sur un disque temporaire.

Les comptes et la progression sont dans Turso, et restent indépendants des redémarrages de Render. Le jeton n’est jamais envoyé au navigateur. Les données d’essai de l’environnement Codex ne sont pas publiées : le site commence avec sa propre base vide.

Les autres réglages sont déjà présents dans `render.yaml` : cookies sécurisés, HTTPS fourni par l’hébergeur et `TRUST_PROXY_HOPS=1` pour son proxy. Ne pas modifier ces réglages pour résoudre un problème de connexion sans diagnostic.

## Limites des offres gratuites

- Render peut mettre le service en veille : la première ouverture suivante peut prendre un moment.
- Le fonctionnement reste soumis aux quotas et à la disponibilité de Render et de Turso. Aucun achat automatique n’est activé par le code.
- L’offre gratuite ne remplace pas un plan de sauvegarde : prévoir des exports et une restauration vérifiée pour des données importantes.
- La vérification d’e-mail et la récupération de mot de passe ne sont pas encore intégrées. Le contenu pédagogique doit être relu avant commercialisation.

## Vérifier l’adresse obtenue

Sur **l’adresse HTTPS réellement attribuée par Render** :

1. Vérifier que `/api/health` renvoie `{"status":"ok","service":"parlio"}`.
2. Terminer une leçon, créer un compte de test, se déconnecter et se reconnecter.
3. Redémarrer le service depuis Render, puis vérifier que la progression revient.
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
