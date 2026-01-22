-- ============================================
-- Base de données : clinique_gestion
-- ============================================

CREATE DATABASE IF NOT EXISTS clinique_gestion CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE clinique_gestion;

-- ============================================
-- Table: users
-- ============================================
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    mot_de_passe VARCHAR(255) NOT NULL,
    role ENUM('admin', 'medecin', 'receptionniste', 'patient') DEFAULT 'patient',
    actif TINYINT(1) DEFAULT 1,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    derniere_connexion TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- Table: medecins
-- ============================================
CREATE TABLE medecins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNIQUE,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    specialite VARCHAR(100) NOT NULL,
    telephone VARCHAR(20),
    disponible TINYINT(1) DEFAULT 1,
    date_embauche DATE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- Table: patients
-- ============================================
CREATE TABLE patients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNIQUE,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    date_naissance DATE NOT NULL,
    telephone VARCHAR(20),
    adresse TEXT,
    groupe_sanguin ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'),
    photo VARCHAR(255),
    date_inscription TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- Table: dossiers_medicaux
-- ============================================
CREATE TABLE dossiers_medicaux (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    medecin_id INT,
    date_consultation DATE NOT NULL,
    diagnostic TEXT,
    observations TEXT,
    ordonnances TEXT,
    examens TEXT,
    allergies TEXT,
    antecedents TEXT,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (medecin_id) REFERENCES medecins(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- Table: rendez_vous
-- ============================================
CREATE TABLE rendez_vous (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    medecin_id INT NOT NULL,
    date_rendez_vous DATETIME NOT NULL,
    type_consultation ENUM('medecine_generale','pediatrie','gynecologie','cardiologie','dermatologie','orl','ophtalmologie','radiologie','laboratoire','orthopedie','nutrition') NOT NULL,
    prix DECIMAL(10,2) NOT NULL,
    montant_paye DECIMAL(10,2) DEFAULT 0.00,
    mode_paiement ENUM('especes','carte','cheque','virement') DEFAULT 'especes',
    statut ENUM('en_attente','confirme','annule','termine') DEFAULT 'en_attente',
    motif TEXT,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (medecin_id) REFERENCES medecins(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- Données de démonstration
-- ============================================

-- 1. Users
INSERT INTO users (id,email,mot_de_passe,role) VALUES
(1,'admin@clinique.com','$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','admin'),
(2,'dr.benali@clinique.com','$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','medecin'),
(3,'dr.alami@clinique.com','$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','medecin'),
(4,'dr.mouhib@clinique.com','$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','medecin'),
(5,'dr.khalid@clinique.com','$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','medecin'),
(6,'patient1@email.com','$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','patient'),
(7,'patient2@email.com','$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','patient');

-- 2. Medecins
INSERT INTO medecins (id,user_id,nom,prenom,specialite,telephone,disponible,date_embauche) VALUES
(1,2,'Benali','Karim','cardiologie','0612345678',1,'2020-01-15'),
(2,3,'Alami','Fatima','pediatrie','0623456789',1,'2019-06-10'),
(3,4,'Mouhib','Hassan','medecine_generale','0634567890',1,'2021-03-20'),
(4,5,'Khalid','Omar','gynecologie','0671234567',1,'2022-05-10');

-- 3. Patients
INSERT INTO patients (id,user_id,nom,prenom,date_naissance,telephone,adresse,groupe_sanguin) VALUES
(1,6,'El Idrissi','Mohamed','1985-05-15','0645678901','123 Rue Hassan II, Casablanca','A+'),
(2,7,'Bennani','Amina','1990-08-22','0656789012','456 Avenue Mohammed V, Rabat','O+');

-- 4. Dossiers médicaux
INSERT INTO dossiers_medicaux (id,patient_id,medecin_id,date_consultation,diagnostic,observations) VALUES
(1,1,3,'2026-01-10','Hypertension','Patient suivi pour tension élevée'),
(2,2,2,'2026-01-11','Rhinite allergique','Suivi enfants');

-- 5. Rendez-vous
INSERT INTO rendez_vous (patient_id,medecin_id,date_rendez_vous,type_consultation,prix,montant_paye,mode_paiement,statut,motif) VALUES
(1,1,'2026-01-15 10:00:00','cardiologie',500.00,0.00,'especes','en_attente','Consultation cardiaque'),
(2,2,'2026-01-15 14:30:00','pediatrie',250.00,0.00,'especes','en_attente','Contrôle pédiatrique'),
(1,3,'2026-01-16 09:00:00','medecine_generale',200.00,0.00,'especes','en_attente','Consultation générale'),
(2,4,'2026-01-17 11:00:00','gynecologie',300.00,0.00,'especes','en_attente','Consultation gynécologique');
