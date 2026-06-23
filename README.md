# Zeylo — Dashboard plateforme & client

Application de gestion SaaS pour Zeylo, composée de **deux dashboards strictement séparés** :

- **`/admin`** — Console plateforme Zeylo (administration globale)
- **`/app`** — Espace entreprise / patron (multi-tenant)
- **`/api`** — API NestJS

Stack : **NestJS · React + Vite · PostgreSQL · Prisma · JWT (access + refresh)**. Déploiement **Docker Compose compatible Dokploy** (Traefik géré par Dokploy, aucune config Traefik ici).

---

## Sommaire

- [Architecture](#architecture)
- [Prérequis](#prérequis)
- [Variables d'environnement](#variables-denvironnement)
- [Déploiement sur Dokploy](#déploiement-sur-dokploy)
- [Lancement local (Docker)](#lancement-local-docker)
- [Développement (sans Docker)](#développement-sans-docker)
- [Première installation (setup admin)](#première-installation-setup-admin)
- [Fonctionnalités](#fonctionnalités)
- [Sécurité](#sécurité)
- [Structure du projet](#structure-du-projet)

---

## Architecture

```
ciphera-zeylo-dashboard/
├── backend/            # API NestJS + Prisma
│   ├── prisma/         # schema, migrations, seed
│   ├── src/
│   │   ├── auth/       # 2 systèmes d'auth séparés (admin / client)
│   │   ├── modules/    # platform, app, files, public
│   │   ├── integrations/ # Twilio / Resend (stubés)
│   │   └── common/     # guards, decorators, audit, filtres
│   └── Dockerfile
├── frontend/           # React + Vite + Tailwind
│   ├── src/
│   │   ├── pages/      # admin/, app/, public/
│   │   ├── components/ # design system + layout
│   │   ├── layouts/    # AdminLayout, AppLayout
│   │   └── stores/     # auth (admin/client), ui
│   ├── nginx.conf      # sert le SPA + proxy /api -> backend
│   └── Dockerfile
├── docker-compose.yml  # postgres + backend + frontend
└── .env.example
```

En production, **seul le service `frontend` (nginx) est exposé**. Il sert le SPA et
relaie `/api` vers le backend via le réseau interne Docker. Le backend et PostgreSQL
ne sont jamais exposés publiquement.

---

## Prérequis

- Docker + Docker Compose (ou une instance Dokploy)
- Node.js 20+ (uniquement pour le développement local hors Docker)

---

## Variables d'environnement

Copiez `.env.example` vers `.env` et adaptez les valeurs :

```bash
cp .env.example .env
```

Générez des secrets JWT robustes et **distincts** (admin ≠ client) :

```bash
openssl rand -base64 48   # à répéter pour chacun des 4 secrets
```

| Variable | Description |
|---|---|
| `POSTGRES_USER/PASSWORD/DB` | Identifiants PostgreSQL |
| `DATABASE_URL` | Chaîne de connexion (host = `postgres`) |
| `CORS_ORIGINS` | Domaine(s) autorisés, séparés par `,` |
| `JWT_ADMIN_ACCESS_SECRET` … | 4 secrets distincts admin/client × access/refresh |
| `JWT_ACCESS_TTL` / `JWT_REFRESH_TTL` | Durées de vie (ex. `900s`, `30d`) |
| `FILE_STORAGE_DIR` | Répertoire de stockage des fichiers (volume) |
| `MAX_UPLOAD_BYTES` | Taille max d'upload |
| `TWILIO_*` / `RESEND_*` / `STRIPE_*` | Intégrations (laisser vide → mode démo) |
| `FRONTEND_PORT` | Port hôte exposé pour Dokploy |

> Les intégrations tierces sont **stubées** : sans clés, l'app fonctionne en mode
> démo (SMS/emails journalisés, jamais envoyés).

> ⚠️ **Mot de passe PostgreSQL** : il est intégré dans `DATABASE_URL`. N'utilisez
> que des caractères URL-safe (lettres + chiffres). Un `/`, `@`, `:`, `+`, `%`…
> provoque l'erreur Prisma `P1013: invalid port number in database URL` et le
> backend ne démarre pas (nginx renvoie alors `502` sur `/api`). Générez-en un
> propre avec `openssl rand -hex 24`. Si vous changez ce mot de passe après un
> premier déploiement, **recréez le volume `postgres_data`** (le mot de passe
> n'est appliqué qu'à la première initialisation de la base).

---

## Déploiement sur Dokploy

1. Dans Dokploy, créez une application **Docker Compose** pointant sur ce dépôt.
2. Renseignez les variables d'environnement (contenu de `.env.example`).
3. Dokploy détecte le service `frontend` (port `80`). Attachez-y votre domaine
   (ex. `dashboard.zeylo.ciphera.ch`) — **Traefik est géré par Dokploy**, aucun
   label n'est requis dans `docker-compose.yml`.
4. Déployez. Au démarrage, le backend :
   - applique les migrations Prisma (`prisma migrate deploy`),
   - amorce les paramètres plateforme (seed idempotent).
5. Rendez-vous sur `https://votre-domaine/admin` → **page de setup initial**.

> ⚠️ Mettez à jour `CORS_ORIGINS` avec votre domaine réel.
> Le site public existant (`zeylo.ciphera.ch`) n'est pas affecté : ce dashboard
> vit sur son propre domaine/sous-domaine.

---

## Lancement local (Docker)

```bash
cp .env.example .env          # ajustez les secrets
docker compose up --build
```

- Frontend : http://localhost:8080
- Admin : http://localhost:8080/admin
- App : http://localhost:8080/app

---

## Développement (sans Docker)

**Backend**
```bash
cd backend
npm install
# Lancez un PostgreSQL local et adaptez DATABASE_URL dans backend/.env
npx prisma migrate deploy
npx prisma db seed
npm run start:dev          # http://localhost:3000/api
```

**Frontend**
```bash
cd frontend
npm install
npm run dev                # http://localhost:5173 (proxy /api -> :3000)
```

---

## Première installation (setup admin)

Comportement type **n8n / Chatwoot** :

- Au premier lancement, **aucun compte admin plateforme n'existe**.
- `/admin` affiche une **page de setup** pour créer le premier administrateur.
- Après création → redirection vers `/admin/login`.
- Une fois un admin créé, la page de setup est **verrouillée** (toute tentative
  d'accès redirige vers `/admin/login`).

Les comptes **client / patron** se créent depuis `/app/register` (essai gratuit).
Les deux systèmes d'authentification sont **strictement séparés** : un token admin
est refusé sur les routes client et inversement.

---

## Fonctionnalités

### Admin plateforme (`/admin`)
Vue d'ensemble (entreprises, MRR, churn, inscriptions) · Entreprises clientes
(liste + détail) · **Accès support journalisé** au contenu métier · Facturation &
abonnements · Programme de parrainage · Journal d'audit · Santé système
(Twilio/Resend/PostgreSQL) · Paramètres plateforme.

### Espace client / patron (`/app`)
Tableau de bord · Employés (fiche, contrat, notes client/patron, congés/absences) ·
Services (catalogue libre) · Chantiers (création, assignation, workflow de statuts,
accès employé temporaire, lien de notation client) · Contacts (prospects/clients) ·
Paramètres + programme de parrainage.

### Pages transverses
- `/access/:token` — accès employé temporaire (lien + code SMS, écran chantier unique)
- `/rate/:token` — notation client à usage unique (1–5 + commentaire)

### Fichiers
Upload sécurisé (MIME + taille + nom nettoyé), stockage **local sur volume Docker**,
métadonnées en base, **aperçu inline** (PDF / images / texte) et téléchargement.
Liens vers entreprises, chantiers, employés, contrats, contacts.

---

## Sécurité

- Hash des mots de passe **argon2id**
- JWT access court + **refresh token rotatif** (haché en base, révocable)
- Claims `actor` (`ADMIN`/`CLIENT`) + secrets distincts → tokens non interchangeables
- **Isolation multi-tenant stricte** (filtrage `companyId` côté service)
- RBAC (`@Roles`), protection brute-force + throttling sur le login
- Validation DTO (class-validator, whitelist), CORS, Helmet
- **Journalisation** des actions sensibles (audit log + accès support)
- Aucun secret hardcodé (tout via `.env`)

---

## Structure du projet

Voir [Architecture](#architecture). Points d'entrée utiles :

- Schéma DB : `backend/prisma/schema.prisma`
- Auth : `backend/src/auth/`
- Endpoints admin : `backend/src/modules/platform/platform.controller.ts`
- Endpoints client : `backend/src/modules/app/app-client.controller.ts`
- Design system : `frontend/src/components/ui/`
- Routes front : `frontend/src/App.tsx`

---

## Domaines personnalisés des clients (liens + page publique)

Un client peut connecter son propre domaine (Paramètres → Domaine) pour des
liens à sa marque et une page publique `https://sondomaine.com/`.

**Côté application (automatique) :** enregistrement du domaine, vérification
DNS (CNAME + TXT), configuration Cloudflare en 1 clic, page publique, et
restriction de sécurité (sur un domaine client, seules les pages publiques
sont servies — `/admin` et `/app` renvoient une page d'erreur). Définir
`VITE_APP_HOST` au build (dérivé de `PUBLIC_LINK_TARGET`) active cette
restriction.

**Côté infrastructure (SSL / routage) — à faire une fois :**

- **Recommandé : Cloudflare.** Si le client laisse l'enregistrement **proxifié**
  (nuage orange — c'est ce que fait l'auto-config), Cloudflare fournit le
  **SSL automatiquement** à la périphérie. Régler le mode SSL Cloudflare sur
  **Full**.
- **Sans Cloudflare :** ajouter le domaine au service `frontend` dans Dokploy
  (Domains) pour que **Traefik émette un certificat Let's Encrypt**, ou
  configurer un domaine **wildcard + certresolver** côté Traefik pour couvrir
  tous les domaines clients automatiquement.

Tant que le hostname n'est pas routé vers le `frontend` (Dokploy/Traefik), le
DNS pointe vers Zeylo mais le certificat/serveur ne répondra pas — c'est
l'unique étape manuelle.

---

© Zeylo · Conçu en Suisse 🇨🇭
