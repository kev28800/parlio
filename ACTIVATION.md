# Activer les abonnements Parlio

Tarifs choisis par le propriétaire : **10,99 € par mois** ou **69,99 € par an**, en euros. Les cours et révisions restent gratuits ; Premium donne accès au bilan avancé et, si son financement est configuré, à l’atelier IA.

Le code est compatible avec Stripe en mode test et en mode réel. **Le mode par défaut reste test, sans encaissement.** Un retour de paiement ne crée aucun droit : le serveur vérifie l’état de Stripe et la signature des notifications. Les données de paiement réel et de test sont stockées séparément.

## Publication actuelle

Vercel reste l’adresse de démonstration et d’apprentissage. Le dépôt utilise son déploiement automatique depuis `main`. Le nouveau code n’active aucun compte Stripe ou abonnement d’hébergement.

**Vercel Hobby est destiné à un usage personnel non commercial.** Ne pas y ouvrir les encaissements. Une configuration Netlify est fournie comme chemin de migration vers un hébergement autorisant l’usage commercial. Choisir uniquement son offre gratuite et vérifier les quotas et conditions proposés lors de l’inscription ; ne pas souscrire à un plan payant sans accord sur son tarif.

## 1. Créer Stripe

Le propriétaire doit créer son compte privé sur [Stripe](https://dashboard.stripe.com/), fournir les informations d’activité et de versement demandées, puis configurer son portail client pour la consultation et la résiliation des abonnements. Ne jamais envoyer ses pièces, coordonnées bancaires ou clés secrètes dans le chat.

Créer un produit Parlio avec deux prix récurrents, quantité 1, en EUR : **10,99 €/mois** et **69,99 €/an**. Commencer dans l’environnement de test. Stripe facture des frais sur les transactions réelles ; la création du code ne vaut pas souscription à une offre payante Stripe.

## 2. Tester avant d’encaisser

Variables privées de l’hébergeur :

| Nom                          | Valeur                                         |
| ---------------------------- | ---------------------------------------------- |
| `STRIPE_MODE`                | `test`                                         |
| `STRIPE_TEST_SECRET_KEY`     | Clé secrète de test `sk_test_…`                |
| `STRIPE_TEST_PRICE_MONTHLY`  | Identifiant `price_…` du prix de test mensuel  |
| `STRIPE_TEST_PRICE_YEARLY`   | Identifiant du prix de test annuel             |
| `STRIPE_TEST_WEBHOOK_SECRET` | Secret `whsec_…` de la destination de test     |
| `PUBLIC_APP_URL`             | Adresse HTTPS du site, sans chemin ni fragment |

Créer une destination de notifications Stripe vers `https://VOTRE-DOMAINE/api/billing/webhook`, avec les événements : `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`.

Tester avec une carte **de test** Stripe, jamais une carte réelle. Vérifier le paiement, l’ouverture du bilan, la résiliation depuis le portail et la suppression du compte. Le serveur impose la devise, le montant, la périodicité et le mode exacts. Il réserve les préparations de paiement par compte et réutilise les sessions ouvertes pour limiter les doubles souscriptions.

## 3. Préparer l’hébergement commercial

Le fichier `netlify.toml` et la fonction `netlify/functions/api.ts` sont fournis. L’adaptateur est testé avec les sessions et les octets bruts de la signature Stripe. Aucun compte Netlify n’a été créé automatiquement.

1. Créer un compte Netlify et importer le dépôt `kev28800/parlio`, branche `main`, avec son offre gratuite si ses conditions conviennent à l’activité.
2. Laisser le fichier `netlify.toml` définir la compilation, `dist`, la fonction et Node.js 24. Le runtime des fonctions doit être **Node.js 24** (`AWS_LAMBDA_JS_RUNTIME=nodejs24.x`).
3. Dans les variables privées disponibles aux **fonctions**, ajouter `DATABASE_URL` et `DATABASE_AUTH_TOKEN` en reprenant la même base Turso. Les données restent dans cette base ; le disque temporaire des fonctions ne sert jamais à conserver les comptes.
4. Conserver `PARLIO_AI_GLOBAL_DAILY_LIMIT=0` pour désactiver les appels IA. Ajouter les variables Stripe **de test**, adapter `PUBLIC_APP_URL` à l’adresse Netlify réellement attribuée et créer la destination de notifications correspondante.
5. Vérifier `/api/health`, une leçon, la connexion et la conservation des progrès. Les cookies ne passent pas d’un domaine à l’autre : se reconnecter. Les personnes utilisant uniquement un essai doivent créer leur compte sur l’ancien site avant de changer d’adresse.
6. Valider les paiements et résiliations de test sur cet hébergement avant de basculer en réel. Une compilation ou un test local ne prouve pas qu’un compte fournisseur est correctement connecté.

## 4. Ouvrir le paiement réel

Le responsable du service doit avoir choisi un hébergement autorisant la vente, effectué la relecture pédagogique et préparé ses informations légales, conditions de vente, traitement des taxes et règles de résiliation. Le code ne fabrique pas l’identité du vendeur et ne remplace pas ces démarches.

Après ces préparatifs, créer les deux prix **dans l’environnement réel** Stripe et une destination de notifications réelle. Ajouter les variables privées suivantes sur l’hébergement commercial :

| Nom                      | Valeur                                                        |
| ------------------------ | ------------------------------------------------------------- |
| `STRIPE_MODE`            | `live`                                                        |
| `BILLING_COMMERCE_READY` | `true`, uniquement après validation des préparatifs ci-dessus |
| `STRIPE_SECRET_KEY`      | Clé secrète réelle `sk_live_…`                                |
| `STRIPE_PRICE_MONTHLY`   | Identifiant du prix réel de 10,99 €/mois                      |
| `STRIPE_PRICE_YEARLY`    | Identifiant du prix réel de 69,99 €/an                        |
| `STRIPE_WEBHOOK_SECRET`  | Secret de la destination de notifications réelle              |
| `PUBLIC_APP_URL`         | Adresse HTTPS de l’hébergement commercial                     |

Sans tous ces réglages, les encaissements restent indisponibles. Les clés de test n’activent pas le mode réel. Les droits Premium acquis en test ne deviennent pas des abonnements payants. Le paiement est hébergé par Stripe ; Parlio ne reçoit pas les numéros de carte. La formule se renouvelle automatiquement ; la résiliation du renouvellement est disponible dans le portail client, avec accès conservé jusqu’à la fin de la période payée.

**Ne pas supprimer la configuration réelle lorsqu’il reste des abonnements actifs.** La suppression d’un compte arrête son client Stripe réel avant d’effacer les données locales ; en cas d’échec du fournisseur, elle est interrompue pour ne pas laisser un abonnement détaché de son compte. Le mode test bloque aussi la suppression si un client réel est encore lié au compte.

Vérifier un achat réel uniquement avec accord explicite sur la transaction. Les tests du dépôt utilisent des fournisseurs simulés et ne débitent aucune carte.

## Pip à l’oral : pratique guidée sans API IA

Ouvrir **Pip à l’oral**, choisir une langue puis **Écouter Pip**. La lecture utilise une voix disponible sur l’appareil. Pour dicter, accepter l’information sur le service vocal puis cliquer sur **Parler à Pip** et autoriser le micro dans le navigateur. La dictée peut être traitée en ligne par ce service ; Parlio ne reçoit pas d’audio brut. Le clavier permet de continuer si la voix, la dictée ou l’autorisation ne sont pas disponibles.

Le site doit utiliser HTTPS ; la politique HTTP autorise `microphone=(self)` sur Vercel, Netlify et le serveur. Aucune capture ne démarre à l’arrivée sur la page. La session s’arrête après 20 secondes, en quittant la page, en changeant de langue ou en passant au clavier. Les phrases guidées viennent des cours et ne nécessitent aucune clé API. La comparaison porte uniquement sur les textes et n’attribue ni score de prononciation ni XP.

Pip est un personnage illustré au rendu semi-réaliste, animé par couches dans le navigateur : pelage fin, expressions de repos et de parole, clignements irréguliers, tête, oreilles, respiration, queue et patte articulées. Le regard et les changements d’attitude utilisent des transitions amorties. Le bouton **Faire coucou** déclenche un salut. Sa bouche s’ouvre pendant la lecture et se ferme à l’arrêt, au démarrage du micro ou en cas d’erreur. Les frontières de mots servent de repères ; à défaut, la cadence est estimée. La synchronisation des lèvres reste approximative, sans analyse audio ni phonèmes fournis par le navigateur.

Le bouton de pause et les réglages de réduction des animations figent les mouvements. Le rendu Canvas 2D fonctionne sans WebGL ; une marionnette vectorielle animée prend le relais si les images ou le dessin Canvas ne sont pas disponibles. Aucune caméra ni aucun service d’avatar externe n’est nécessaire. Le rendu illustré ne permet pas de tourner librement autour d’un modèle 3D. Les voix et la reconnaissance dépendent de l’appareil ; les tests utilisent des services vocaux simulés. Vérifier le micro et les trois langues sur les navigateurs ciblés avant d’annoncer leur prise en charge.

## IA : désactivée et indépendante de ChatGPT Plus

Le tuteur demande une clé et un budget API OpenAI, distincts de ChatGPT Plus. La publication Vercel fixe `PARLIO_AI_GLOBAL_DAILY_LIMIT=0` ; aucun appel payant n’est nécessaire pour les leçons ou le bilan Premium.

Si un budget est accepté ultérieurement, les réglages sont `PARLIO_AI_API_KEY`, `PARLIO_AI_MODEL` (défaut `gpt-4.1-mini`), `PARLIO_AI_DAILY_LIMIT` (défaut 20) et `PARLIO_AI_GLOBAL_DAILY_LIMIT` (défaut hors Vercel 100). Une limite à zéro désactive l’IA. Les plafonds portent sur le nombre de demandes, pas sur un montant garanti ; configurer les alertes et limites du projet chez le fournisseur.

Le consentement est demandé avant d’envoyer les messages à OpenAI. Dix messages récents au maximum servent de contexte ; prénom et e-mail ne sont pas ajoutés au prompt. Les conversations sont séparées par langue et effaçables, même après la fin de Premium. La séance IA quotidienne est créée à la demande, jamais par une tâche de fond. Ses réponses peuvent comporter des erreurs pédagogiques.

Avec l’IA activée et un compte Premium, le mode **Conversation IA** permet de dicter un message, le relire puis l’envoyer explicitement. Le bouton **Écouter avec Pip** lit le court texte dans la langue apprise ; les explications restent en français. Ce fonctionnement par tours n’utilise pas OpenAI Realtime et ne juge pas la prononciation.

## Limites restantes

Les trois cours originaux nécessitent une relecture pédagogique avant commercialisation. La vérification d’e-mail et la récupération de mot de passe ne sont pas encore disponibles. Les sauvegardes, la restauration et la conservation doivent être organisées pour l’exploitation. Les tests locaux ne valident ni les identifiants privés, ni l’activation réelle des fournisseurs, ni la qualité des réponses d’un modèle connecté.
