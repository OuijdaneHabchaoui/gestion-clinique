# Gestion Clinique

Application web de gestion d'une clinique médicale, développée en PHP avec une architecture MVC.

## Ce que fait l'application

- Inscription et connexion des utilisateurs
- Tableau de bord principal
- Gestion des patients
- Gestion des médecins
- Gestion des rendez-vous
- Gestion des comptes utilisateurs
- Modification du profil avec photo

## Technologies utilisées

- PHP (backend)
- MySQL (base de données)
- HTML / CSS / JavaScript (frontend)

## Structure du projet

```
gestion-clinique/
├── config/              # Connexion à la base de données
├── controllers/         # Logique métier (auth, patients, médecins, rendez-vous...)
├── models/              # Interactions avec la base de données
├── views/
│   ├── pages/           # Pages HTML (dashboard, login, patients...)
│   └── assets/          # CSS, JS, images
├── uploads/
│   └── profiles/        # Photos de profil
└── database/
    └── schema.sql       # Structure de la base de données
```

## Installation

1. Cloner le projet
```bash
git clone https://github.com/OuijdaneHabchaoui/gestion-clinique.git
```

2. Importer la base de données
```bash
mysql -u root -p < database/schema.sql
```

3. Configurer la connexion dans le dossier `config/`

4. Lancer avec XAMPP ou WAMP et ouvrir dans le navigateur

## Auteur

[OuijdaneHabchaoui](https://github.com/OuijdaneHabchaoui)
