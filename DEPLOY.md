# Deploying blogserver to EC2

Runbook for putting this API on an Amazon Linux 2023 instance, behind Nginx, with
HTTPS. Roughly 30 minutes end to end.

The finished setup:

```
browser ──HTTPS──> Nginx :443 ──proxy──> Node :8000 ──> MongoDB Atlas
          (Let's Encrypt)      (127.0.0.1)   (systemd)
```

Nginx terminates TLS and forwards to the app on loopback. The app is never exposed
on a public port.

## What you need first

- An EC2 instance running Amazon Linux 2023, and its `.pem` key
- Access to the repo on GitHub
- Your MongoDB Atlas login
- The URL of the deployed frontend (currently `https://blogclient-chi.vercel.app`)

---

## 1. Give the instance a fixed IP

A default EC2 public IP changes every time the instance stops. Both DuckDNS and the
Atlas allowlist point at an IP, so it has to be stable.

**EC2 console → Elastic IPs → Allocate Elastic IP address → Associate** with your
instance.

Note the address down; it is referred to below as `<ELASTIC_IP>`.

> An Elastic IP is free while it is attached to a running instance, and billed at a
> small hourly rate while it is allocated but unattached.

## 2. Open the right ports

**EC2 console → your instance → Security → Security groups → Edit inbound rules.**

| Type  | Port | Source      | Why                              |
| ----- | ---- | ----------- | -------------------------------- |
| SSH   | 22   | My IP       | Your admin access                |
| HTTP  | 80   | 0.0.0.0/0   | Certbot's domain validation      |
| HTTPS | 443  | 0.0.0.0/0   | The API itself                   |

**Do not open 8000.** Nginx reaches the app over loopback; exposing it publicly would
let people bypass TLS.

## 3. Get a free domain

Let's Encrypt will not issue a certificate for a bare IP address, nor for an
`ec2-*.compute.amazonaws.com` hostname. DuckDNS gives you a real subdomain for free.

1. Go to [duckdns.org](https://www.duckdns.org) and sign in
2. Create a subdomain, for example `kathiravan-blog`
3. Put `<ELASTIC_IP>` in the **current ip** box and press **update ip**

Your API will live at `kathiravan-blog.duckdns.org`. That value is `<API_DOMAIN>` below.

Check it resolves before continuing — DNS can take a minute:

```bash
nslookup kathiravan-blog.duckdns.org
```

## 4. Bootstrap the instance

```bash
ssh -i your-key.pem ec2-user@<ELASTIC_IP>
```

Install Node 22, Nginx, Certbot, and a swap file:

```bash
curl -fsSL https://raw.githubusercontent.com/Kathiravan292/blogserver/main/deploy/setup-ec2.sh | bash
```

The swap file matters more than it looks. A `t2.micro` or `t3.micro` has 1 GB of RAM,
and `npm ci` followed by a TypeScript build will exhaust it. The symptom is a build
that dies with `Killed` and no other explanation.

## 5. Get the code onto the box

If the repo is **public**:

```bash
git clone https://github.com/Kathiravan292/blogserver.git ~/blogserver
```

If it is **private**, create a read-only deploy key:

```bash
ssh-keygen -t ed25519 -C "ec2-blogserver" -f ~/.ssh/id_ed25519 -N ""
cat ~/.ssh/id_ed25519.pub
```

Copy that public key into **GitHub → the repo → Settings → Deploy keys → Add deploy
key**. Leave "Allow write access" unchecked. Then:

```bash
ssh-keyscan github.com >> ~/.ssh/known_hosts
git clone git@github.com:Kathiravan292/blogserver.git ~/blogserver
```

## 6. Write the production `.env`

```bash
cd ~/blogserver
nano .env
```

```bash
MONGO_URI=mongodb+srv://kkathiravan785_db_user:PASSWORD@blogapp.zilqxdt.mongodb.net/blog?retryWrites=true&w=majority&appName=blogapp
PORT=8000
JWT_SECURE_CODE=GENERATE_A_NEW_ONE
JWT_EXPIRES_IN=9d
CORS_ORIGINS=https://blogclient-chi.vercel.app
```

Generate a secret that is **not** the one from your laptop, so a leak on one side does
not compromise the other:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Lock the file down, since it holds both the database password and the signing key:

```bash
chmod 600 .env
```

`CORS_ORIGINS` must match the frontend's origin exactly — scheme included, no trailing
slash. A mismatch shows up as a CORS error in the browser console while `curl` works
fine.

## 7. Let Atlas accept the instance

This is the step that catches almost everyone. Atlas rejects connections from any IP
not on its allowlist, and the failure looks like a generic timeout.

**Atlas → Network Access → Add IP Address →** enter `<ELASTIC_IP>/32`, comment it
"EC2 production", **Confirm**. Wait for the status to go from *Pending* to *Active*.

## 8. Build and verify

```bash
cd ~/blogserver
npm ci
npm run build
npm run check:db
```

`check:db` should print:

```
PASS  Connected. Database: blog
```

If it does not, stop here — the service will not start either. See
[Troubleshooting](#troubleshooting).

Then drop the build-only dependencies:

```bash
npm prune --omit=dev
```

## 9. Run it under systemd

```bash
sudo cp deploy/blogserver.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now blogserver
sudo systemctl status blogserver
```

You want `Active: active (running)`. Confirm it is actually serving:

```bash
curl http://127.0.0.1:8000/api/v1/blog/getallblog
```

systemd restarts the app if it crashes and starts it on boot, so a reboot needs no
intervention. Logs go to the journal:

```bash
sudo journalctl -u blogserver -f
```

## 10. Put Nginx in front

```bash
sudo cp deploy/nginx-blogserver.conf /etc/nginx/conf.d/blogserver.conf
sudo sed -i "s/API_DOMAIN/kathiravan-blog.duckdns.org/" /etc/nginx/conf.d/blogserver.conf
sudo nginx -t
sudo systemctl reload nginx
```

```bash
curl http://kathiravan-blog.duckdns.org/api/v1/blog/getallblog
```

A `502 Bad Gateway` here is almost always SELinux — see
[Troubleshooting](#troubleshooting).

## 11. Turn on HTTPS

```bash
sudo certbot --nginx -d kathiravan-blog.duckdns.org --agree-tos -m you@example.com --redirect
```

Certbot edits the Nginx config in place: it adds the `listen 443` block, the
certificate paths, and a redirect from port 80. Enable automatic renewal:

```bash
sudo systemctl enable --now certbot-renew.timer
sudo certbot renew --dry-run
```

Certificates last 90 days; the timer renews at 60.

```bash
curl https://kathiravan-blog.duckdns.org/api/v1/blog/getallblog
```

## 12. Point the frontend at it

**Vercel → the blogclient project → Settings → Environment Variables:**

| Name                | Value                                                |
| ------------------- | ---------------------------------------------------- |
| `VITE_API_BASE_URL` | `https://kathiravan-blog.duckdns.org/api/v1`         |

Vite reads environment variables at **build** time, not run time, so changing this
does nothing until you **Deployments → ⋯ → Redeploy**.

Then open the site, sign in, and confirm blogs load with no errors in the console.

---

## Deploying again later

```bash
ssh -i your-key.pem ec2-user@<ELASTIC_IP>
cd ~/blogserver && bash deploy/deploy.sh
```

That pulls `main`, reinstalls, rebuilds, checks the database, prunes, restarts the
service, and tails the log. Pass a branch name to deploy something else:

```bash
bash deploy/deploy.sh my-feature-branch
```

---

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Build dies with `Killed`, no error | Out of RAM on a micro instance | Swap is missing — re-run `deploy/setup-ec2.sh` |
| `502 Bad Gateway` from Nginx | SELinux blocks the loopback connection | `sudo setsebool -P httpd_can_network_connect 1` |
| `502` and the app is stopped | Service crashed | `sudo journalctl -u blogserver -n 50` |
| Atlas connection times out | Instance IP not allowlisted | Add `<ELASTIC_IP>/32` under Atlas → Network Access |
| `bad auth : authentication failed` | Wrong password, or `<db_password>` left in `.env` | Fix `MONGO_URI`, then `npm run check:db` |
| Service refuses to start, `Invalid environment configuration` | `.env` missing or incomplete | Check it exists in `~/blogserver` and is readable by `ec2-user` |
| CORS error in the browser, `curl` works | Origin missing from `CORS_ORIGINS` | Add the exact frontend origin, then restart the service |
| Frontend still calls the old API | Vite bakes the URL in at build time | Redeploy on Vercel after changing the variable |
| Certbot fails to validate | Port 80 closed, or DNS not propagated | Check the security group and `nslookup <API_DOMAIN>` |
| Everything breaks after a stop/start | Public IP changed | Attach an Elastic IP (step 1) |

Useful commands:

```bash
sudo systemctl status blogserver      # is it running
sudo journalctl -u blogserver -f      # follow the app log
sudo tail -f /var/log/nginx/blogserver.error.log
sudo nginx -t                         # validate nginx config
npm run check:db                      # test the database connection alone
free -h                               # confirm swap is active
```

## Notes

- **Nothing sets up backups.** Atlas free tier has no automated backups; take periodic
  snapshots from the Atlas UI if the data matters.
- **Cost.** The instance is the only meaningful charge. The Elastic IP is free while
  attached, DuckDNS and Let's Encrypt are free, Atlas free tier is free.
- **Secrets.** `.env` lives only on the instance and is gitignored. If you ever need to
  rotate the Atlas password or the JWT secret, edit `.env` and
  `sudo systemctl restart blogserver`. Rotating `JWT_SECURE_CODE` invalidates every
  issued token, so all users have to sign in again.
