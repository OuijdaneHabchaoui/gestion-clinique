<?php
/**
 * API Profile Controller
 * Gestion du profil utilisateur (consultation, modification, upload photo)
 */

class ProfileController
{
    private $pdo;
    private $userModel;
    private $patientModel;
    private $medecinModel;

    public function __construct($pdo)
    {
        $this->pdo = $pdo;
        $this->userModel = new User($pdo);
        $this->patientModel = new Patient($pdo);
        $this->medecinModel = new Medecin($pdo);
    }

    public function process($action, $id, $data)
    {
        switch ($action) {
            case 'get':
                $this->getProfile($id);
                break;
            case 'put':
                $this->updateProfile($id, $data);
                break;
            case 'upload_photo':
                $this->uploadPhoto($id);
                break;
            default:
                sendResponse(false, "Action non supportée", null, 405);
        }
    }

    private function getProfile($userId)
    {
        if (!$userId) {
            sendResponse(false, "ID utilisateur requis", null, 400);
        }

        try {
            $user = $this->userModel->findById($userId);
            if (!$user) {
                sendResponse(false, "Utilisateur non trouvé", null, 404);
            }

            $profile = $user;

            // Enrichir avec les infos du profil selon le rôle
            if ($user['role'] === 'medecin') {
                $medecin = $this->medecinModel->findByUserId($userId);
                if ($medecin) {
                    $profile['medecin'] = $medecin;
                    $profile['photo'] = $medecin['photo'] ?? null;
                }
            } elseif ($user['role'] === 'patient') {
                $patient = $this->patientModel->findByUserId($userId);
                if ($patient) {
                    $profile['patient'] = $patient;
                    $profile['photo'] = $patient['photo'] ?? null;
                }
            } else {
                $profile['photo'] = null;
            }

            // Fallback : Si pas de photo en DB (ex: médecin), chercher le fichier sur le disque
            if (empty($profile['photo']) || $user['role'] === 'medecin') {
                $uploadDir = __DIR__ . '/../uploads/profiles/';
                // Chercher profile_{ID}.*
                $files = glob($uploadDir . 'profile_' . $userId . '.*');
                if (!empty($files)) {
                    // Prendre le premier trouvé
                    $foundFile = basename($files[0]);
                    $profile['photo'] = 'uploads/profiles/' . $foundFile;
                }
            }

            sendResponse(true, "Profil récupéré", $profile);
        } catch (PDOException $e) {
            sendResponse(false, "Erreur serveur : " . $e->getMessage(), null, 500);
        }
    }

    private function updateProfile($userId, $data)
    {
        if (!$userId) {
            sendResponse(false, "ID utilisateur requis", null, 400);
        }

        try {
            $user = $this->userModel->findById($userId);
            if (!$user) {
                sendResponse(false, "Utilisateur non trouvé", null, 404);
            }

            $this->pdo->beginTransaction();

            // 1. Mise à jour de la table users
            $userUpdateData = [];
            if (!empty($data['email'])) {
                if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
                    $this->pdo->rollBack();
                    sendResponse(false, "Email invalide", null, 400);
                }
                $userUpdateData['email'] = $data['email'];
            }
            if (!empty($data['mot_de_passe'])) {
                $userUpdateData['mot_de_passe'] = $data['mot_de_passe'];
            }

            if (!empty($userUpdateData)) {
                $this->userModel->update($userId, $userUpdateData);
            }

            // 2. Mise à jour du profil spécifique selon le rôle
            if ($user['role'] === 'medecin') {
                $medecin = $this->medecinModel->findByUserId($userId);
                if ($medecin) {
                    $this->medecinModel->update($medecin['id'], $data);
                }
            } elseif ($user['role'] === 'patient') {
                $patient = $this->patientModel->findByUserId($userId);
                if ($patient) {
                    $this->patientModel->update($patient['id'], $data);
                }
            }

            $this->pdo->commit();
            sendResponse(true, "Profil mis à jour avec succès");
        } catch (Exception $e) {
            $this->pdo->rollBack();
            sendResponse(false, "Erreur mise à jour : " . $e->getMessage(), null, 500);
        }
    }

    private function uploadPhoto($userId)
    {
        if (!$userId) {
            sendResponse(false, "ID utilisateur requis", null, 400);
        }

        if (!isset($_FILES['photo']) || $_FILES['photo']['error'] !== UPLOAD_ERR_OK) {
            sendResponse(false, "Aucune photo uploadée ou erreur d'upload", null, 400);
        }

        $file = $_FILES['photo'];

        // Validation du type
        $allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        $fileType = mime_content_type($file['tmp_name']);

        if (!in_array($fileType, $allowedTypes)) {
            sendResponse(false, "Type de fichier non autorisé. Utilisez JPG, PNG, GIF ou WebP", null, 400);
        }

        // Validation de la taille (max 5MB)
        $maxSize = 5 * 1024 * 1024;
        if ($file['size'] > $maxSize) {
            sendResponse(false, "Fichier trop volumineux. Maximum 5MB", null, 400);
        }

        try {
            $user = $this->userModel->findById($userId);
            if (!$user) {
                sendResponse(false, "Utilisateur non trouvé", null, 404);
            }

            // Créer le dossier uploads
            $uploadDir = __DIR__ . '/../uploads/profiles/';
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0755, true);
            }

            // Supprimer les anciennes photos de cet utilisateur (toutes extensions)
            $oldFiles = glob($uploadDir . 'profile_' . $userId . '.*');
            foreach ($oldFiles as $oldFile) {
                if (is_file($oldFile))
                    unlink($oldFile);
            }

            // Générer nom prévisible (SANS timestamp pour pouvoir le retrouver sans BDD)
            $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
            if (empty($extension)) {
                // Fallback extension from mime type if missing
                $extMap = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/gif' => 'gif', 'image/webp' => 'webp'];
                $extension = $extMap[$fileType] ?? 'jpg';
            }

            $filename = 'profile_' . $userId . '.' . $extension;
            $filepath = $uploadDir . $filename;

            if (!move_uploaded_file($file['tmp_name'], $filepath)) {
                sendResponse(false, "Erreur lors de l'enregistrement du fichier", null, 500);
            }

            $photoPath = 'uploads/profiles/' . $filename;

            // Mettre à jour selon le rôle SI la table le supporte (patients)
            if ($user['role'] === 'patient') {
                $patient = $this->patientModel->findByUserId($userId);
                if ($patient) {
                    $this->patientModel->update($patient['id'], ['photo' => $photoPath]);
                }
            }
            // Pour médecin, on ne fait rien en BDD car pas de colonne photo.
            // La photo sera retrouvée grâce à son nom prévisible.

            sendResponse(true, "Photo uploadée avec succès", ['photo' => $photoPath]);
        } catch (Exception $e) {
            sendResponse(false, "Erreur upload : " . $e->getMessage(), null, 500);
        }
    }
}
