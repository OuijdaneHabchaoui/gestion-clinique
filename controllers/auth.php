<?php
/**
 * API Auth Controller
 * Gestion de l'authentification (login/register)
 */

class AuthController
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
        if ($action === 'login' || ($action === 'post' && !isset($data['nom']))) {
            $this->login($data);
        } elseif ($action === 'register') {
            $this->register($data);
        } else {
            sendResponse(false, "Action auth non supportée", null, 405);
        }
    }

    private function login($data)
    {
        if (empty($data['email']) || empty($data['mot_de_passe'])) {
            sendResponse(false, "Email et mot de passe requis", null, 400);
        }

        try {
            $user = $this->userModel->findByEmail($data['email']);

            if ($user && password_verify($data['mot_de_passe'], $user['mot_de_passe'])) {
                if (!$user['actif']) {
                    sendResponse(false, "Votre compte a été désactivé", null, 403);
                }

                // Ne jamais renvoyer le hash du mot de passe
                unset($user['mot_de_passe']);

                // Mise à jour dernière connexion
                $this->userModel->updateLastLogin($user['id']);

                // Enrichir la réponse avec les infos du profil
                $user['profile_id'] = null;
                $user = $this->enrichUserData($user);

                sendResponse(true, "Connexion réussie", $user);
            } else {
                sendResponse(false, "Email ou mot de passe incorrect", null, 401);
            }
        } catch (PDOException $e) {
            sendResponse(false, "Erreur serveur lors de la connexion", null, 500);
        }
    }

    private function register($data)
    {
        $required = ['email', 'mot_de_passe', 'nom', 'prenom', 'date_naissance'];
        foreach ($required as $field) {
            if (empty($data[$field])) {
                sendResponse(false, "Tous les champs sont requis ($field manquant)", null, 400);
            }
        }

        try {
            $this->pdo->beginTransaction();

            // Vérifier email unique
            if ($this->userModel->emailExists($data['email'])) {
                $this->pdo->rollBack();
                sendResponse(false, "Cet email est déjà utilisé", null, 409);
                return;
            }

            // Créer l'utilisateur
            $userId = $this->userModel->create([
                'email' => $data['email'],
                'mot_de_passe' => $data['mot_de_passe'],
                'role' => 'patient'
            ]);

            // Créer le profil patient
            $profileId = $this->patientModel->create($data, $userId);

            $this->pdo->commit();

            sendResponse(true, "Compte créé avec succès", [
                'id' => $userId,
                'email' => $data['email'],
                'role' => 'patient',
                'profile_id' => $profileId,
                'nom' => $data['nom'],
                'prenom' => $data['prenom'],
                'patient_infos' => [
                    'id' => $profileId,
                    'nom' => $data['nom'],
                    'prenom' => $data['prenom']
                ]
            ]);

        } catch (Exception $e) {
            $this->pdo->rollBack();
            sendResponse(false, "Erreur Technique : " . $e->getMessage(), null, 500);
        }
    }

    private function enrichUserData($user)
    {
        if ($user['role'] === 'patient') {
            $patient = $this->patientModel->findByUserId($user['id']);
            if ($patient) {
                $user['patient_infos'] = $patient;
                $user['nom'] = $patient['nom'];
                $user['prenom'] = $patient['prenom'];
                $user['profile_id'] = $patient['id'];
            }
        } elseif ($user['role'] === 'medecin') {
            $medecin = $this->medecinModel->findByUserId($user['id']);
            if ($medecin) {
                $user['medecin_infos'] = $medecin;
                $user['nom'] = $medecin['nom'];
                $user['prenom'] = $medecin['prenom'];
                $user['profile_id'] = $medecin['id'];
            }
        } elseif ($user['role'] === 'admin') {
            $emailParts = explode('@', $user['email']);
            $user['nom'] = ucfirst($emailParts[0]);
            $user['prenom'] = '';
            $user['profile_id'] = null;
        }

        return $user;
    }
}
