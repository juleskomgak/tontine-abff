# 🗄️ Configuration de la Base de Données

Vous avez **3 options** pour configurer la base de données :

## ✅ Option 1 : MongoDB Atlas (Cloud - GRATUIT et Recommandé)

MongoDB Atlas offre un plan gratuit parfait pour le développement.

### Étapes :

1. **Créer un compte MongoDB Atlas** :
   - Allez sur https://www.mongodb.com/cloud/atlas/register
   - Créez un compte gratuit

2. **Créer un cluster gratuit** :
   - Cliquez sur "Build a Database"
   - Choisissez le plan **FREE** (M0)
   - Sélectionnez une région proche (ex: Europe)
   - Cliquez sur "Create Cluster"

3. **Configurer l'accès** :
   - **Database Access** : Créez un utilisateur avec username et password
   - **Network Access** : Ajoutez `0.0.0.0/0` (permet l'accès depuis n'importe où)

4. **Obtenir la chaîne de connexion** :
   - Cliquez sur "Connect" sur votre cluster
   - Choisissez "Connect your application"
   - Copiez la chaîne de connexion (format: `mongodb+srv://...`)

5. **Configurer le projet** :
   ```bash
   # Éditez le fichier .env
   nano .env
   
   # Remplacez la ligne MONGODB_URI par :
   MONGODB_URI=mongodb+srv://votre_username:votre_password@cluster0.xxxxx.mongodb.net/tontine_abff?retryWrites=true&w=majority
   ```

## ✅ Option 2 : MongoDB avec Docker (Simple)

Si vous avez Docker installé :

```bash
# Lancer MongoDB dans un conteneur Docker
docker run -d \
  --name mongodb \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=password123 \
  mongo:latest

# La connexion sera déjà configurée dans .env
```

## ✅ Option 3 : Installer MongoDB localement

### macOS (sans proxy) :

```bash
# Télécharger directement depuis le site MongoDB
# https://www.mongodb.com/try/download/community

# Ou avec Homebrew si vous avez une connexion directe :
brew tap mongodb/brew
brew install mongodb-community@7.0

# Démarrer MongoDB
brew services start mongodb-community@7.0
```

### Vérifier que MongoDB fonctionne :

```bash
# Test de connexion
mongosh
# ou
mongo
```

---

## 🚀 Démarrage de l'application

Une fois MongoDB configuré :

```bash
# 1. Installer les dépendances
npm install

# 2. Initialiser la base de données avec des données de test
node server/seed.js

# 3. Démarrer le serveur backend
npm run server

# 4. Dans un autre terminal, démarrer le frontend
cd client
npm install
ng serve
```

L'application sera accessible sur **http://localhost:4200**

---

## 🔧 Dépannage

### Erreur de connexion MongoDB :
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
**Solution** : MongoDB n'est pas démarré ou n'est pas installé. Utilisez MongoDB Atlas (Option 1).

### Erreur "MongoServerError: bad auth" :
**Solution** : Vérifiez vos identifiants dans le fichier `.env`

### Le serveur ne démarre pas :
**Solution** : Vérifiez que le port 5000 n'est pas déjà utilisé :
```bash
lsof -i :5000
# Si utilisé, changez le PORT dans .env
```
