# Déploiement en production — VecteurGN

Guide étape par étape pour déployer l'application sur un serveur de production avec Kubernetes.
Pour un premier déploiement, comptez 1 à 2 heures (hors création du cluster).

---

## Vue d'ensemble

```
Internet ──▶ DNS (ton-domaine.com) ──▶ Ingress (TLS) ──┬──▶ Service frontend ──▶ Pods nginx (Expo web)
                                                        └──▶ Service backend  ──▶ Pods FastAPI ──▶ PostgreSQL
```

Options possibles pour chaque brique :

| Brique | Options |
|--------|---------|
| Cluster Kubernetes | k3s / kubeadm sur VPS (Hetzner, OVH, Scaleway…), ou managé (DigitalOcean DOKS, Scaleway Kapsule, GKE, EKS) |
| Registre d'images | Docker Hub, GitHub Container Registry (ghcr.io), GitLab Registry |
| Base de données | PostgreSQL en StatefulSet dans le cluster (fourni par `k8s/02-postgres.yaml`), ou managée (Neon, Supabase, Railway) |
| TLS | cert-manager + Let's Encrypt |
| DNS | Chez ton registrar, ou Cloudflare |

Ce guide suit l'option "cluster + Postgres in-cluster" déjà préparée dans `k8s/`.
Si vous préférez une base managée (Neon/Supabase), ignorez l'étape 4 et mettez son `DATABASE_URL` directement à l'étape 5.

---

## 1. Provisionner un serveur / cluster Kubernetes

### Option A — VPS unique avec k3s (le plus simple, le moins cher)

```bash
# Sur le VPS (Ubuntu 22.04+), en root
curl -sfL https://get.k3s.io | sh -
# Récupérer le kubeconfig pour s'y connecter depuis ta machine
cat /etc/rancher/k3s/k3s.yaml
```

Copier ce fichier en local dans `~/.kube/config` (remplacer `127.0.0.1` par l'IP publique du serveur).

### Option B — Cluster managé (recommandé si budget dispo)

DigitalOcean DOKS, Scaleway Kapsule, ou OVH Managed Kubernetes : suivre l'assistant de création
puis télécharger le kubeconfig fourni par le provider.

Vérifier l'accès :

```bash
kubectl get nodes
```

---

## 2. Installer un Ingress Controller + cert-manager

```bash
# Ingress nginx
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.11.2/deploy/static/provider/cloud/deploy.yaml

# cert-manager (TLS automatique via Let's Encrypt)
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.15.1/cert-manager.yaml
```

Créer un `ClusterIssuer` pour Let's Encrypt (`k8s/06-cluster-issuer.yaml`, à créer) :

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: TON_EMAIL@exemple.com
    privateKeySecretRef:
      name: letsencrypt-prod-key
    solvers:
      - http01:
          ingress:
            ingressClassName: nginx
```

```bash
kubectl apply -f k8s/06-cluster-issuer.yaml
```

---

## 3. Pointer le DNS

Chez ton registrar (ou Cloudflare), créer un enregistrement `A` :

```
ton-domaine.com   →  IP publique du serveur / load balancer du cluster
```

Pour un cluster managé, l'IP à utiliser est celle donnée par :

```bash
kubectl get svc -n ingress-nginx ingress-nginx-controller
# colonne EXTERNAL-IP
```

Attendre la propagation DNS (`dig ton-domaine.com`).

---

## 4. Builder et pousser les images sur un registre

```bash
# Se connecter au registre (exemple GitHub Container Registry)
docker login ghcr.io -u TON_USER

# Backend — build depuis la racine du projet
docker build -f backend/Dockerfile -t ghcr.io/MON_ORG/vecteurgn-backend:latest .
docker push ghcr.io/MON_ORG/vecteurgn-backend:latest

# Frontend — EXPO_PUBLIC_BACKEND_URL doit être l'URL PUBLIQUE finale (baked au build)
docker build \
  -f frontend/Dockerfile \
  --build-arg EXPO_PUBLIC_BACKEND_URL=https://ton-domaine.com \
  -t ghcr.io/MON_ORG/vecteurgn-frontend:latest \
  ./frontend
docker push ghcr.io/MON_ORG/vecteurgn-frontend:latest
```

> Si le registre est privé, créer aussi un `imagePullSecret` et le référencer dans les Deployments :
> `kubectl create secret docker-registry regcred --docker-server=ghcr.io --docker-username=... --docker-password=... -n vecteurgn`

---

## 5. Configurer les secrets de production

Éditer `k8s/01-secrets.yaml` (ne jamais commiter les vraies valeurs — utiliser un fichier local
hors Git, comme `k8s/01-secrets.local.yaml` déjà ignoré par `.gitignore`) :

```yaml
stringData:
  DATABASE_URL: "postgresql://vecteur:MOT_DE_PASSE_FORT@postgres:5432/vecteurgn"
  SECRET_KEY: "cle-jwt-longue-et-aleatoire"   # ex: openssl rand -hex 32
  POSTGRES_PASSWORD: "MOT_DE_PASSE_FORT"
```

Générer un secret JWT fort :

```bash
openssl rand -hex 32
```

---

## 6. Mettre à jour les manifests avec les vraies images et le domaine

- `k8s/03-backend.yaml` → remplacer `YOUR_REGISTRY/vecteurgn-backend:latest`
- `k8s/04-frontend.yaml` → remplacer `YOUR_REGISTRY/vecteurgn-frontend:latest`
- `k8s/05-ingress.yaml` → remplacer `ton-domaine.com`, et ajouter TLS :

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: vecteurgn-ingress
  namespace: vecteurgn
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /$2
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - ton-domaine.com
      secretName: vecteurgn-tls
  rules:
    - host: ton-domaine.com
      http:
        paths:
          - path: /api(/|$)(.*)
            pathType: ImplementationSpecific
            backend:
              service:
                name: backend
                port:
                  number: 8000
          - path: /
            pathType: Prefix
            backend:
              service:
                name: frontend
                port:
                  number: 80
```

---

## 7. Déployer

```bash
kubectl apply -f k8s/00-namespace.yaml
kubectl apply -f k8s/01-secrets.yaml
kubectl apply -f k8s/02-postgres.yaml
kubectl apply -f k8s/03-backend.yaml
kubectl apply -f k8s/04-frontend.yaml
kubectl apply -f k8s/05-ingress.yaml
```

Vérifier :

```bash
kubectl get pods -n vecteurgn -w
kubectl get certificate -n vecteurgn        # doit passer à READY=True (~1-2 min)
kubectl logs -n vecteurgn deploy/backend
```

Une fois tous les pods `Running` et le certificat `READY`, l'app est accessible sur
`https://ton-domaine.com`.

---

## 8. Vérifications post-déploiement

- [ ] `https://ton-domaine.com` charge le frontend
- [ ] Connexion avec `vecteur` / `vecteurgn` fonctionne (⚠️ **changer ce mot de passe admin en prod**, voir `/api/auth/me` puis endpoint de changement de mot de passe)
- [ ] `https://ton-domaine.com/api/auth/me` répond (401 sans token = normal)
- [ ] Certificat TLS valide (cadenas vert dans le navigateur)
- [ ] `kubectl get pods -n vecteurgn` → tous les pods `Running`, 0 restart en boucle

---

## 9. Sauvegardes PostgreSQL

Le Postgres tourne en StatefulSet avec un PVC de 5 Gi (`k8s/02-postgres.yaml`). Prévoir des dumps réguliers :

```bash
kubectl exec -n vecteurgn postgres-0 -- pg_dump -U vecteur vecteurgn > backup-$(date +%F).sql
```

Automatiser via un CronJob Kubernetes si le volume de données le justifie.

---

## 10. Mise à jour de l'application (nouvelle version)

```bash
# Rebuild + push la nouvelle image
docker build -f backend/Dockerfile -t ghcr.io/MON_ORG/vecteurgn-backend:v2 .
docker push ghcr.io/MON_ORG/vecteurgn-backend:v2

# Rolling update
kubectl set image deployment/backend backend=ghcr.io/MON_ORG/vecteurgn-backend:v2 -n vecteurgn
kubectl rollout status deployment/backend -n vecteurgn

# Rollback si problème
kubectl rollout undo deployment/backend -n vecteurgn
```
