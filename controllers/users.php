<?php
/**
 * API Users Controller
 * Gestion CRUD des utilisateurs (admin uniquement pour modifications)
 */

class UsersController
{
    private $pdo;
    private $userModel;

    public function __construct($pdo)
    {
        $this->pdo = $pdo;
        $this->userModel = new User($pdo);
    }

    /**
     * Vérifie que l'utilisateur est admin
     */
    private function requireAdmin($data)
    {
        $authUserId = $data['auth_user_id'] ?? null;

        if (!$authUserId) {
            sendResponse(false, "Authentification requise : auth_user_id manquant", null, 401);
            exit;
        }

        if (!$this->userModel->isAdmin($authUserId)) {
            sendResponse(false, "Accès refusé : seuls les administrateurs peuvent effectuer cette action", null, 403);
            exit;
        }

        return true;
    }

    public function process($action, $id, $data)
    {
        switch ($action) {
            case 'get':
                $this->get($id);
                break;
            case 'post':
                $this->requireAdmin($data);
                $this->create($data);
                break;
            case 'put':
                $this->requireAdmin($data);
                $this->update($id, $data);
                break;
            case 'delete':
                $this->requireAdmin($data);
                $this->delete($id);
                break;
            default:
                sendResponse(false, "Action non supportée", null, 405);
        }
    }

    private function get($id)
    {
        try {
            if ($id) {
                $user = $this->userModel->findById($id);
                if ($user) {
                    sendResponse(true, "Utilisateur récupéré", $user);
                } else {
                    sendResponse(false, "Utilisateur non trouvé", null, 404);
                }
            } else {
                $users = $this->userModel->findAll();
                sendResponse(true, "Liste des utilisateurs", $users);
            }
        } catch (Exception $e) {
            sendResponse(false, "Erreur lors de la récupération des utilisateurs: " . $e->getMessage(), null, 500);
        }
    }

    private function create($data)
    {
        // Validation
        if (empty($data['email']) || empty($data['mot_de_passe'])) {
            sendResponse(false, "Email et mot de passe requis", null, 400);
        }
        if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            sendResponse(false, "Email invalide", null, 400);
        }
        if ($this->userModel->emailExists($data['email'])) {
            sendResponse(false, "Cet email est déjà utilisé", null, 409);
        }

        try {
            $userId = $this->userModel->create($data);
            sendResponse(true, "Utilisateur créé avec succès", ['id' => $userId], 201);
        } catch (PDOException $e) {
            sendResponse(false, "Erreur lors de la création : " . $e->getMessage(), null, 500);
        }
    }

    private function update($id, $data)
    {
        if (!$id) {
            sendResponse(false, "ID manquant pour la mise à jour", null, 400);
        }

        if (!$this->userModel->findById($id)) {
            sendResponse(false, "Utilisateur non trouvé", null, 404);
        }

        if (isset($data['email']) && !filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            sendResponse(false, "Email invalide", null, 400);
        }

        try {
            $this->userModel->update($id, $data);
            sendResponse(true, "Utilisateur mis à jour");
        } catch (PDOException $e) {
            sendResponse(false, "Erreur lors de la mise à jour : " . $e->getMessage(), null, 500);
        }
    }

    private function delete($id)
    {
        if (!$id) {
            sendResponse(false, "ID manquant pour la suppression", null, 400);
        }

        try {
            if ($this->userModel->delete($id)) {
                sendResponse(true, "Utilisateur supprimé");
            } else {
                sendResponse(false, "Utilisateur non trouvé", null, 404);
            }
        } catch (PDOException $e) {
            sendResponse(false, "Erreur lors de la suppression : " . $e->getMessage(), null, 500);
        }
    }
}
