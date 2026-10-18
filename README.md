# Calendrier personnel IMT Mines Alès

Worker Cloudflare **gratuit pour un usage personnel** qui récupère votre emploi du temps IMT Mines Alès avec votre session école, génère un flux iCalendar propre et le republie en HTTPS pour Google Agenda.

> Ce projet n'est pas un service officiel de l'école. Il est conçu pour un seul élève et un seul compte école. Respectez les règles d'utilisation du site source.

## Fonctionnement

```text
Google Agenda
    ↓ abonnement à une URL HTTPS secrète
Cloudflare Worker
    ↓ cache (45 minutes par défaut)
Site planning-eleves IMT Mines Alès
```

Le Worker ne demande jamais votre mot de passe à Google et n'écrit rien dans votre compte Google. Il republie seulement un flux ICS que vous pouvez supprimer à tout moment.

## Confidentialité et limites

- Ce projet est prévu pour **un seul élève** et un seul compte école.
- Les identifiants sont des secrets d'environnement et ne doivent jamais être commités.
- Le token de l'URL ICS donne accès au planning : ne le partagez pas.
- Google actualise les calendriers abonnés avec un délai possible de 12 à 24 heures.
- Le projet ne lit pas et n'écrit pas dans Google Agenda. Une future option API Google nécessiterait OAuth, des jetons Google et une synchronisation active.
- Le serveur de l'école est interrogé au plus une fois par fenêtre de cache.
- En cas de panne temporaire de l'école, le dernier flux valide est servi.

## Prérequis

- un compte Cloudflare gratuit ;
- Node.js 20 ou plus récent et npm ;
- vos identifiants du planning école ;
- votre identifiant interne d'élève, par exemple `20432` ;
- un terminal et Git.

L'offre gratuite Cloudflare suffit pour un usage personnel raisonnable. Aucun domaine ni carte bancaire n'est nécessaire : le projet utilise une adresse `workers.dev`.

## Développement local

```sh
npm install
cp .env.example .dev.vars
```

Remplissez `.dev.vars` :

```dotenv
PLANNING_USERNAME=votre_identifiant
PLANNING_PASSWORD=votre_mot_de_passe
STUDENT_ID=20432
CALENDAR_TOKEN=un_token_long
CACHE_TTL_SECONDS=2700
SCHOOL_BASE_URL=https://webdfd.mines-ales.fr/planning-eleves
```

`STUDENT_ID` est l'identifiant obtenu dans le catalogue des élèves du site source. Il ne s'agit pas forcément de votre numéro étudiant.

Générez un token aléatoire :

```sh
openssl rand -hex 32
```

Ne partagez jamais l'URL complète du flux : toute personne qui possède le token peut lire le planning.

Lancer le Worker :

```sh
npm run dev
```

Puis ouvrez `http://localhost:8787/`. Le flux local est affiché par la page d'accueil.

## Vérifier avant déploiement

```sh
npm test
npm run build
```

Le mode dry-run ne contacte ni Cloudflare ni le site de l'école :

```sh
npm run dry-run -- fixtures/personal.ics > generated.ics
grep -c '^BEGIN:VEVENT' generated.ics
```

Les tests utilisent uniquement une fixture ICS anonymisée.

## Déploiement pas à pas

### 1. Créer le compte Cloudflare

Allez sur <https://dash.cloudflare.com/sign-up>, créez un compte et choisissez le plan **Free**. N'ajoutez pas de carte bancaire et n'ajoutez pas de domaine : le projet utilise gratuitement `workers.dev`.

### 2. Installer les dépendances et connecter Wrangler

Depuis le dossier du projet :

```sh
npm install
npx wrangler login
npx wrangler whoami
```

Une page du navigateur s'ouvre pendant `wrangler login`. Autorisez Wrangler puis revenez au terminal.

### 3. Enregistrer le sous-domaine gratuit

Déployez une première fois :

```sh
npx wrangler deploy
```

Quand Wrangler demande un sous-domaine `workers.dev`, choisissez un nom public en minuscules, par exemple `imt-calendar-votre-id`. L'URL finale ressemblera à :

```text
https://imt-mines-ales-calendar.imt-calendar-votre-id.workers.dev
```

### 4. Ajouter les secrets

Les secrets sont saisis dans Wrangler et ne doivent pas être écrits dans `wrangler.toml` :

```sh
npx wrangler secret put PLANNING_USERNAME
npx wrangler secret put PLANNING_PASSWORD
npx wrangler secret put CALENDAR_TOKEN
```

Collez chaque valeur uniquement quand Wrangler la demande, puis appuyez sur Entrée. Ne transmettez jamais ces valeurs dans une issue, un chat ou un commit.

Modifiez `STUDENT_ID` dans `wrangler.toml` si nécessaire, puis redéployez :

```sh
npx wrangler deploy
```

### 5. Tester le Worker

```sh
curl -i https://VOTRE_WORKER.workers.dev/health
```

Le résultat attendu contient `HTTP/2 200` et `ok`.

Ouvrez ensuite :

```text
https://VOTRE_WORKER.workers.dev/
```

La page affiche l'URL HTTPS privée du flux et son équivalent `webcal://`.

Pour vérifier le contenu sans afficher le token dans l'historique shell :

```sh
read -rsp 'URL complète du flux ICS : ' CALENDAR_URL
echo
curl -sS -D /tmp/imt_headers -o /tmp/imt_calendar.ics "$CALENDAR_URL"
unset CALENDAR_URL
grep -Ei 'HTTP/|content-type:|warning:|x-calendar-stale:' /tmp/imt_headers
grep -c '^BEGIN:VEVENT' /tmp/imt_calendar.ics
```

Le résultat attendu est `text/calendar` et un nombre d'événements supérieur à zéro.

### 6. Ajouter le flux à Google Agenda

Sur Google Agenda dans un navigateur ordinateur :

1. Créez un calendrier dédié, par exemple `Cours IMT`.
2. À gauche, cliquez sur **Autres agendas**, puis sur `+`.
3. Choisissez **À partir de l'URL**.
4. Collez l'URL HTTPS affichée par le Worker.
5. Cliquez sur **Ajouter un agenda**.
6. Vérifiez que le calendrier est coché dans la colonne de gauche.

Google peut mettre plusieurs heures, parfois 12 à 24 heures, à actualiser un abonnement. Le premier test avec `curl` doit toutefois déjà contenir des `VEVENT`.

### 7. Mettre à jour le projet

```sh
git pull
npm install
npm test
npm run build
npx wrangler deploy
```

Les secrets Cloudflare restent associés au Worker lors d'un redéploiement.

## Architecture

- `src/school-client.ts` : session et téléchargement authentifié.
- `src/ics-parser.ts` : parsing des événements source.
- `src/campus.ts` : détection prudente de Clavières/Croupillac.
- `src/ics-generator.ts` : génération ICS, UID stables, échappement et alarmes.
- `src/cache.ts` : cache mémoire local ou KV.
- `src/worker.ts` : routes HTTPS, token, limitation simple, stale-if-error et interface française.

## Dépannage

- `502` : vérifier les secrets et l'accès au site source ; le Worker ne remplace jamais une réponse HTML de connexion par un faux calendrier.
- Flux vide : contrôler `STUDENT_ID`.
- `404` : utilisez l'URL complète se terminant par `/calendar/<token>.ics`, pas seulement le sous-domaine `workers.dev`.
- Erreur TLS juste après la création de `workers.dev` : attendez quelques minutes la propagation du certificat.
- Erreur `ERESOLVE` : utilisez les versions du `package.json` et ne passez pas `--force` par défaut.
- Aucun changement dans Google : attendre le délai de rafraîchissement de Google et vérifier que l'URL HTTPS complète est utilisée.

## Évolutions possibles

- KV obligatoire et métriques minimales non sensibles.
- Validation avec une bibliothèque iCalendar dédiée.
- Interface de rotation du token.
- Option B : API Google Calendar avec OAuth, création d'un calendrier dédié et synchronisation horaire. Cette option nécessite un consentement Google et écrit réellement dans le compte.
