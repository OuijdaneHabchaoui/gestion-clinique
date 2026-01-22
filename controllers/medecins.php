<?php
/**
 * API Medecins Controller
 * Gestion CRUD des médecins
 */

class MedecinsController
{
    private $pdo;
    private $medecinModel;
    private $userModel;

    public function __construct($pdo)
    {
        $this->pdo = $pdo;
        $this->medecinModel = new Medecin($pdo);
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
            $medecin = $this->medecinModel->findById($id);
            if ($medecin) {
                // Ajouter les rendez-vous si demandé
                if (isset($_GET['with_rendezvous'])) {
                    $rvModel = new RendezVous($this->pdo);
                    $medecin['rendez_vous'] = $rvModel->findByMedecinId($id);
                }
                sendResponse(true, "Médecin récupéré", $medecin);
            } else {
                sendResponse(false, "Médecin non trouvé", null, 404);
            }
        } else {
            $search = $_GET['search'] ?? null;
            $specialite = $_GET['specialite'] ?? null;
            $medecins = $this->medecinModel->findAll($search, $specialite);
            sendResponse(true, "Liste des médecins", $medecins);
        }
    }

    private function create($data)
    {
        if (empty($data['user_id']) || empty($data['nom']) || empty($data['prenom'])) {
            sendResponse(false, "user_id, nom et prenom sont requis", null, 400);
        }

        // Vérifier si le user_id existe
        if (!$this->userModel->findById($data['user_id'])) {
            sendResponse(false, "user_id invalide", null, 400);
        }

        // Vérifier unicité user_id dans medecins
        if ($this->medecinModel->findByUserId($data['user_id'])) {
            sendResponse(false, "Ce médecin a déjà un profil", null, 409);
        }

        try {
            $medecinId = $this->medecinModel->create($data, $data['user_id']);
            sendResponse(true, "Médecin créé", ['id' => $medecinId], 201);
        } catch (PDOException $e) {
            sendResponse(false, "Erreur création : " . $e->getMessage(), null, 500);
        }
    }

    private function update($id, $data)
    {
        if (!$id) {
            sendResponse(false, "ID manquant", null, 400);
        }

        try {
            $result = $this->medecinModel->update($id, $data);
            if ($result === false) {
                sendResponse(false, "Rien à mettre à jour", null, 400);
            }
            sendResponse(true, "Médecin mis à jour");
        } catch (PDOException $e) {
            sendResponse(false, "Erreur mise à jour : " . $e->getMessage(), null, 500);
        }
    }

    private function delete($id)
    {
        if (!$id) {
            sendResponse(false, "ID manquant", null, 400);
        }

        try {
            if ($this->medecinModel->delete($id)) {
                sendResponse(true, "Médecin supprimé");
            } else {
                sendResponse(false, "Médecin non trouvé", null, 404);
            }
        } catch (PDOException $e) {
            sendResponse(false, "Erreur suppression : " . $e->getMessage(), null, 500);
        }
    }
}
