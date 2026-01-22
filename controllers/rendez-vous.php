<?php
/**
 * API Rendez-Vous Controller
 * Gestion CRUD des rendez-vous
 */

class RendezVousController
{
    private $pdo;
    private $rvModel;

    public function __construct($pdo)
    {
        $this->pdo = $pdo;
        $this->rvModel = new RendezVous($pdo);
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
            $rv = $this->rvModel->findById($id);
            if ($rv) {
                sendResponse(true, "Rendez-vous récupéré", $rv);
            } else {
                sendResponse(false, "Rendez-vous non trouvé", null, 404);
            }
        } else {
            // Appliquer les filtres depuis $_GET
            $filters = [];
            if (isset($_GET['patient_id']))
                $filters['patient_id'] = $_GET['patient_id'];
            if (isset($_GET['medecin_id']))
                $filters['medecin_id'] = $_GET['medecin_id'];
            if (isset($_GET['statut']))
                $filters['statut'] = $_GET['statut'];
            if (isset($_GET['date']))
                $filters['date'] = $_GET['date'];

            $liste = $this->rvModel->findAll($filters);
            sendResponse(true, "Liste des rendez-vous", $liste);
        }
    }

    private function create($data)
    {
        // Mapping intelligent
        if (!isset($data['date_rendez_vous']) && isset($data['date_heure'])) {
            $data['date_rendez_vous'] = $data['date_heure'];
        }

        // Valeurs par défaut
        if (empty($data['prix']))
            $data['prix'] = 300.00;
        if (empty($data['type_consultation']))
            $data['type_consultation'] = 'medecine_generale';

        $required = ['patient_id', 'medecin_id', 'date_rendez_vous'];
        foreach ($required as $field) {
            if (empty($data[$field])) {
                sendResponse(false, "Champ manquant : $field", null, 400);
            }
        }

        // 1. Vérifier si le créneau est libre
        if (!$this->rvModel->isSlotAvailable($data['medecin_id'], $data['date_rendez_vous'])) {
            sendResponse(false, "Ce médecin n'est pas disponible à cet horaire (créneau déjà pris).", null, 409);
        }

        // 2. Vérifier la limite journalière (ex: 20 max)
        $dailyCount = $this->rvModel->countDailyAppointments($data['medecin_id'], $data['date_rendez_vous']);
        $MAX_DAILY_APPOINTMENTS = 20;

        if ($dailyCount >= $MAX_DAILY_APPOINTMENTS) {
            sendResponse(false, "Le planning de ce médecin est complet pour cette journée.", null, 409);
        }

        try {
            $newId = $this->rvModel->create($data);
            sendResponse(true, "Rendez-vous créé", ['id' => $newId], 201);
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
            $result = $this->rvModel->update($id, $data);
            if ($result === false) {
                sendResponse(false, "Rien à mettre à jour", null, 400);
            }
            sendResponse(true, "Rendez-vous mis à jour");
        } catch (Exception $e) {
            sendResponse(false, "Erreur mise à jour : " . $e->getMessage(), null, 500);
        }
    }

    private function delete($id)
    {
        if (!$id) {
            sendResponse(false, "ID manquant", null, 400);
        }

        try {
            if ($this->rvModel->delete($id)) {
                sendResponse(true, "Rendez-vous supprimé");
            } else {
                sendResponse(false, "Rendez-vous non trouvé", null, 404);
            }
        } catch (PDOException $e) {
            sendResponse(false, "Erreur suppression : " . $e->getMessage(), null, 500);
        }
    }
}
