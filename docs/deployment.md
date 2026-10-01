# Deployment guide

How to put STES.tn online, either on a server you manage (**option A, VPS**)
or on managed services (**option B, a Node hosting platform with MongoDB
Atlas**). Both end with the same first-launch steps.

## 1. What runs in production

- **One Node.js process** (`backend/server.js`). It serves:
  - the API (`/api/...`);
  - the built shop (`frontend/dist`), with each page sent with its own title and link-preview picture;
  - `/sitemap.xml` and `/robots.txt`.
- **MongoDB** (version 7 is what CI tests against). Products, orders, customers, settings and reminder sign-ups live here.
- **An uploads folder** (`UPLOAD_PATH`), which holds the product photos and other admin uploads. It must survive deployments and be backed up with the database.
- **A daily job at 9:00 Tunis time, inside the same process.** It emails the pool care reminders and deletes reminder sign-ups not confirmed within 7 days.

Because of the daily job and the uploads folder, run **exactly one instance**
of the server. Do not scale it horizontally.

Requirements:
- Node.js 20 or newer (`engines` in `backend/package.json`; CI uses 22);
- HTTPS on the public address;
- an SMTP account for emails.

## 2. Before you start

| Item | Needed for | Notes |
|---|---|---|
| Domain name (e.g. `stes.tn`) | Everything | DNS access to add records |
| SMTP account | Order, invoice, password-reset and reminder emails | See [section 7](#7-email) |
| Secrets | Sessions and signed links | Generate, never reuse the demo ones |
| Payment gateway contracts | Online card payments | Optional at launch: cash on delivery and bank transfer work without them |
| Catalogue files | Products | The French Excel file and the photos ZIP used on the demo |

Generate each secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## 3. Production settings (`.env`)

The server reads `.env` at the **repository root**. Start from
`.env.example`. In production, change at least these:

| Variable | Production value |
|---|---|
| `NODE_ENV` | `production` |
| `MONGODB_URI` | The database connection string (see option A or B) |
| `PORT` | The port the process listens on (e.g. `9000`; platforms often set it) |
| `FRONTEND_URL` | `https://stes.tn`: used in emails, the sitemap, link previews and CORS |
| `BACKEND_URL` | Same as `FRONTEND_URL` when the server hosts the shop: payment webhooks are sent to `BACKEND_URL/api/payments/webhook/...` |
| `SERVE_FRONTEND` | `true` |
| `TRUST_PROXY` | `1` behind a reverse proxy or a hosting platform, so rate limits apply per visitor |
| `UPLOAD_PATH` | An absolute path on persistent storage (e.g. `/var/lib/stes/uploads`) |
| `JWT_SECRET` | A new 48-byte secret. Required: it signs admin sessions and reminder links |
| `CUSTOMER_JWT_SECRET` | Optional, a second new secret for customer sessions |
| `DEFAULT_ADMIN_USERNAME`, `DEFAULT_ADMIN_EMAIL`, `DEFAULT_ADMIN_PASSWORD` | The first admin (password: 12 characters or more). Remove the password from `.env` once the admin exists |
| `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS` | The SMTP account. Without them no email is sent, so reminder sign-ups can never be confirmed |
| `ADMIN_NOTIFICATION_EMAIL` | Who receives new contact and quote requests (empty: every admin with the forms permission) |
| `*_ENABLED` for payments and SMS | `true` only once that provider's credentials are filled in |
| `VAPID_*` | Optional push notifications (`cd backend && npm run generate-vapid`). Leave empty to turn them off |

> **Never run `npm run seed` on the production database.** It deletes all
> products and admins.

## 4. Option A: a VPS (server you manage)

Suits a small Linux server, e.g. Ubuntu 24.04 LTS with 2 GB of RAM, at a
host of your choice. Everything runs on that one machine: MongoDB, the Node
server, and Caddy for HTTPS.

### 4.1 DNS

Point the domain to the server: an `A` record for `stes.tn` (and
`www.stes.tn`) with the server's IPv4 address, plus `AAAA` if it has IPv6.

### 4.2 System packages

As root (or with `sudo`):

```bash
apt update && apt upgrade -y
# Node.js 22 (NodeSource)
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs git
# Firewall: SSH and the web only (MongoDB stays private)
ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw enable
```

Install **MongoDB 7.0 Community** by following MongoDB's instructions for
your Ubuntu version (https://www.mongodb.com/docs/manual/administration/install-on-linux/),
then:

```bash
systemctl enable --now mongod
```

Keep MongoDB on `127.0.0.1` (the default `bindIp`), and turn on
authentication:

```bash
mongosh
> use admin
> db.createUser({ user: "stes", pwd: "<a long password>", roles: [{ role: "readWrite", db: "stes" }] })
```

Then add these lines to `/etc/mongod.conf`:

```yaml
security:
  authorization: enabled
```

Run `systemctl restart mongod`, and use:

```env
MONGODB_URI=mongodb://stes:<password>@127.0.0.1:27017/stes?authSource=admin
```

### 4.3 The application

```bash
adduser --system --group --home /srv/stes stes
mkdir -p /var/lib/stes/uploads && chown -R stes:stes /var/lib/stes
sudo -u stes git clone https://github.com/Ahmed-Zekri-Data/STES.git /srv/stes/app
cd /srv/stes/app
sudo -u stes bash -c "cd backend && npm ci --omit=dev"
sudo -u stes bash -c "cd frontend && npm ci && npm run build"
sudo -u stes cp .env.example .env   # then edit it (section 3)
chmod 600 .env
```

### 4.4 Keep it running: systemd

`/etc/systemd/system/stes.service`:

```ini
[Unit]
Description=STES.tn shop and API
After=network.target mongod.service
Wants=mongod.service

[Service]
User=stes
WorkingDirectory=/srv/stes/app/backend
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload && systemctl enable --now stes
journalctl -u stes -f      # the server's logs
```

If MongoDB is not up yet when the server starts, the server tries again
every 5 seconds. `/api/health` answers 503 until it is connected.

### 4.5 HTTPS: Caddy

Install Caddy (https://caddyserver.com/docs/install), then put this in
`/etc/caddy/Caddyfile`:

```
stes.tn {
	encode gzip
	reverse_proxy 127.0.0.1:9000
}

www.stes.tn {
	redir https://stes.tn{uri} permanent
}
```

Then run `systemctl reload caddy`. Caddy obtains and renews the
certificates itself. Keep `TRUST_PROXY=1` in `.env`.

### 4.6 Backups

Once a night, dump the database and copy the uploads, then keep a copy
**off the server** (another machine, or object storage). `/etc/cron.d/stes-backup`:

```
30 2 * * * stes  d=/var/backups/stes/$(date +\%F) && mkdir -p $d && mongodump --uri="$(grep ^MONGODB_URI= /srv/stes/app/.env | cut -d= -f2-)" --archive=$d/db.gz --gzip && tar czf $d/uploads.tgz -C /var/lib/stes uploads && find /var/backups/stes -maxdepth 1 -mtime +14 -exec rm -rf {} +
```

`mongodump` comes with the MongoDB Database Tools. Create `/var/backups/stes`
owned by `stes`. Restore with:

```bash
mongorestore --uri="<MONGODB_URI>" --archive=db.gz --gzip --drop
tar xzf uploads.tgz -C /var/lib/stes
```

Test a restore once, on another machine, before relying on it.

### 4.7 Updating

```bash
cd /srv/stes/app
sudo -u stes git pull
sudo -u stes bash -c "cd backend && npm ci --omit=dev"
sudo -u stes bash -c "cd frontend && npm ci && npm run build"
systemctl restart stes
```

## 5. Option B: managed hosting with MongoDB Atlas

Nobody has to maintain a server. You need two services:

- **MongoDB Atlas** for the database;
- **a Node hosting platform** (Render, Railway, Fly.io, or similar) for the application.

### 5.1 MongoDB Atlas

1. Create a project and a cluster in a European region close to Tunisia
   (e.g. Paris or Frankfurt). Check that the chosen tier includes backups.
   The free tier has none and is meant for trials.
2. **Database Access:** create a user with `readWrite` on database `stes`.
3. **Network Access:** allow the platform's outgoing IP addresses. Use
   `0.0.0.0/0` only if the platform has no fixed addresses; the user
   password then becomes the only protection, so make it long.
4. **Connect → Drivers** gives the string. Set it as
   `MONGODB_URI=mongodb+srv://stes:<password>@<cluster>.mongodb.net/stes?retryWrites=true&w=majority`.

### 5.2 The application

On the platform, create one **web service** from the GitHub repository with:

| Setting | Value |
|---|---|
| Runtime | Node.js 22 |
| Build command | `cd backend && npm ci --omit=dev && cd ../frontend && npm ci && npm run build` |
| Start command | `cd backend && node server.js` |
| Instances | **1**, no autoscaling (section 1) |
| Health check path | `/api/health` |
| Persistent disk | **Required**: mount it (e.g. at `/data`) and set `UPLOAD_PATH=/data/uploads`. Without it, uploaded photos disappear at the next deploy |
| Environment variables | Everything from section 3 (the platform sets `PORT`), with `TRUST_PROXY=1` |

The platform provides HTTPS. Add the custom domain in its settings, and the
DNS records it asks for (usually a `CNAME`, or `A` records for the root
domain).

The repository has no `.env` on the platform: enter the variables in the
platform's environment settings instead.

### 5.3 Backups

Atlas backs up the database on paid tiers; check how many days it keeps.
The **uploads disk is not covered by Atlas**. Use the platform's disk
snapshots if it offers them, or download the folder regularly.

### 5.4 Updating

Pushing to `main` (or a manual deploy, depending on the platform) rebuilds
and restarts the service. The uploads disk and the database are kept.

## 6. First launch (both options)

1. **Check the server:** `https://stes.tn/api/health` must answer
   `{"status":"OK","database":"connected", ...}`.
2. **Create the first admin.** On the server (option A), or in the platform's shell (option B), run:
   ```bash
   cd backend && npm run create-admin
   ```
   Then remove `DEFAULT_ADMIN_PASSWORD` from the settings. Sign in at
   `https://stes.tn/admin`, and create the other admins with their own
   permissions in Admin → Users.
3. **Default pages:** `cd backend && npm run init:pages` creates the About
   and Contact pages. It does not overwrite existing ones.
4. **Admin → Settings:**
   - shop details and contact information;
   - the bank account for transfers;
   - the home page products and the pool builder equipment;
   - the reminder calendar.
5. **Catalogue:**
   - Admin → Products → **Import** with the French Excel file;
   - then **Import photos** with the photos (the files are named after the product codes);
   - check the categories in Admin → Categories.

   An alternative to importing again is to copy the demo database with
   `mongodump` / `mongorestore` and the demo uploads folder. Only do this if
   the demo holds no test orders or test customers you would carry over.
6. **Test before announcing the site:**
   - a cash-on-delivery order, then mark it delivered: the customer email arrives with its PDF invoice;
   - the contact form: the request reaches the admin email;
   - a reminder sign-up on `/entretien`: the confirmation email arrives, and its button confirms;
   - one card payment per enabled gateway;
   - delete these test orders and sign-ups afterwards.

## 7. Email

Any SMTP account works. In order of preference:

- **The domain's own mailbox** (e.g. `contact@stes.tn` from the domain or
  email host).
- **A transactional email service** (Brevo, Mailjet, Amazon SES...): better
  delivery for larger volumes.
- **Gmail with an app password**: fine for a test. Limited to a few hundred
  messages a day, and sent "from" a gmail.com address.

With the domain's mailbox or a transactional service, add the **SPF**,
**DKIM** and **DMARC** DNS records the provider gives. Without them, order
and reminder emails often land in spam.

## 8. Online payments

Each gateway (Paymee, Flouci, D17, Konnect) is off until its `*_ENABLED` is
`true` and its keys are set. Gateways confirm payments by calling
`BACKEND_URL/api/payments/webhook/<gateway>`, which must be the public HTTPS
address. Test each one in the gateway's test mode first, if it has one.

## 9. Monitoring

- Add an uptime monitor (UptimeRobot, Better Stack...) on
  `https://stes.tn/api/health`. It answers **503** when the database cannot
  be reached, not just when the server is down.
- Logs: `journalctl -u stes` (option A) or the platform's log view
  (option B). The daily job logs how many reminders it emailed.

## 10. Security checklist

- [ ] New `JWT_SECRET` (and `CUSTOMER_JWT_SECRET`), never the demo's
- [ ] Admin password of 12 characters or more; `DEFAULT_ADMIN_PASSWORD` removed from the settings after creating the admin
- [ ] `NODE_ENV=production`, HTTPS only, `TRUST_PROXY=1` behind the proxy
- [ ] MongoDB not reachable from the internet (option A), or Atlas network access restricted (option B)
- [ ] `.env` readable by the service user only (option A)
- [ ] Backups running, and one restore tested
- [ ] Payment and SMS providers enabled only with real credentials
- [ ] `npm audit` clean in `backend/` and `frontend/` before each release

## 11. After launch

Add the site to Google Search Console
(https://search.google.com/search-console) and submit
`https://stes.tn/sitemap.xml`. Product pages carry price, stock and rating
data that Google can show in results.

## Choosing between A and B

| | A: VPS | B: managed + Atlas |
|---|---|---|
| Monthly cost | Lower: one small server | Higher: the platform (with a disk) plus Atlas with backups |
| Maintenance | System and MongoDB updates, backups, monitoring are yours | The platform and Atlas handle the system, MongoDB and database backups |
| Skills needed | Basic Linux administration | Filling in web forms and settings |
| Data location | Where the server is (a Tunisian host is possible) | The Atlas region (Europe) and the platform's region |
| Recovery from a crash | Your backups and a new server | Mostly automatic; restore the uploads disk |
