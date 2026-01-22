<?php
/**
 * API Patients Controller
 * Gestion CRUD des patients
 */

class PatientsController
{
    private $pdo;
    private $patientModel;
    private $userModel;

    public function __construct($pdo)
    {
        $this->pdo = $pdo;
        $this->patientModel = new Patient($pdo);
        $this->userModel = new User($pdo);
    }

    public function process($action, $id, $data)
    {
        switch ($action) {
            case 'get':
                $this->get($id);
                break;
            case 'post':
                $this->create($data);
                break;
            case 'put':
                $this->update($id, $data);
                break;
            case 'delete':
                $this->delete($id);
                break;
            default:
                sendResponse(false, "Action non supportée", null, 405);
        }
    }

    private function get($id)
    {
        if ($id) {
            $patient = $this->patientModel->findById($id);
            if ($patient) {
                // Ajouter les relations
                $patient['rendez_vous'] = $this->patientModel->getRendezVous($id);
                sendResponse(true, "Patient récupéré avec détails", $patient);
            } else {
                sendResponse(false, "Patient non trouvé", null, 404);
            }
        } else {
            $search = $_GET['search'] ?? null;
            $patients = $this->patientModel->findAll($search);
            sendResponse(true, "Liste des patients", $patients);
        }
    }

    private function create($data)
    {
        // Validation
        if (empty($data['nom']) || empty($data['prenom']) || empty($data['email'])) {
            sendResponse(false, "Nom, prénom et email requis", null, 400);
        }

        try {
            $this->pdo->beginTransaction();

            // Vérifier email unique
            if ($this->userModel->emailExists($data['email'])) {
                $this->pdo->rollBack();
                sendResponse(false, "Cet email est déjà utilisé", null, 409);
            }

            // Créer le compte utilisateur
            $password = $data['password'] ?? '123456';
            $userId = $this->userModel->create([
                'email' => $data['email'],
                'mot_de_passe' => $password,
                'role' => 'patient'
            ]);

            // Créer la fiche patient
            $patientId = $this->patientModel->create($data, $userId);

            $this->pdo->commit();
            sendResponse(true, "Patient créé avec succès", ['id' => $patientId], 201);

        } catch (PDOException $e) {
            $this->pdo->rollBack();
            sendResponse(false, "Erreur création : " . $e->getMessage(), null, 500);
        }
    }

    private function update($id, $data)
    {
        if (!$id) {
            sendResponse(false, "ID requis", null, 400);
        }

        $userId = $this->patientModel->getUserId($id);
        if (!$userId) {
            sendResponse(false, "Patient non trouvé", null, 404);
        }

        try {
            $this->pdo->beginTransaction();

            // Mise à jour du patient
            $this->patientModel->update($id, $data);

            // Mise à jour de l'email si fourni
            if (!empty($data['email'])) {
                if ($this->userModel->emailExists($data['email'], $userId)) {
                    throw new Exception("Cet email est déjà utilisé par un autre utilisateur");
                }
                $this->userModel->update($userId, ['email' => $data['email']]);
            }

            $this->pdo->commit();
            sendResponse(true, "Patient mis à jour avec succès");
        } catch (Exception $e) {
            $this->pdo->rollBack();
            sendResponse(false, "Erreur mise à jour : " . $e->getMessage(), null, 500);
        }
    }

    private function delete($id)
    {
        if (!$id) {
            sendResponse(false, "ID manquant", null, 400);
        }

        try {
            if ($this->patientModel->delete($id)) {
                sendResponse(true, "Patient supprimé");
            } else {
                sendResponse(false, "Patient non trouvé", null, 404);
            }
        } catch (PDOException $e) {
            sendResponse(false, "Erreur suppression : " . $e->getMessage(), null, 500);
        }
    }
}
