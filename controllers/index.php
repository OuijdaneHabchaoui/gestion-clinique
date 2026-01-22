<?php
/**
 * API Router Principal
 * Point d'entrée unique pour toutes les requêtes API
 * 
 * URL Format: /api/?entity=xxx&action=yyy&id=zzz
 */

// Configuration et helpers
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/helpers.php';

// Chargement des modèles
require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../models/Patient.php';
require_once __DIR__ . '/../models/Medecin.php';
require_once __DIR__ . '/../models/RendezVous.php';

// Gestion des CORS
handleCors();

// Session
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Récupération des paramètres
$entity = $_GET['entity'] ?? null;
$action = $_GET['action'] ?? null;
$id = $_GET['id'] ?? null;

// Déduction de l'action depuis la méthode HTTP
if (!$action) {
    $method = $_SERVER['REQUEST_METHOD'];
    $actionMap = [
        'GET' => 'get',
        'POST' => 'post',
        'PUT' => 'put',
        'DELETE' => 'delete'
    ];
    $action = $actionMap[$method] ?? 'get';
}

// Validation
if (!$entity) {
    sendResponse(false, "Paramètre 'entity' manquant.", null, 400);
}

// Récupération des données
$data = [];
if ($_SERVER['REQUEST_METHOD'] === 'POST' || $_SERVER['REQUEST_METHOD'] === 'PUT') {
    if (!empty($_FILES)) {
        $data = $_POST;
    } else {
        $input = getJsonInput();
        $data = !empty($input) ? $input : $_POST;
    }
}

// Routage vers les contrôleurs
try {
    switch ($entity) {
        case 'auth':
            require_once __DIR__ . '/auth.php';
            $controller = new AuthController($pdo);
            break;
        case 'users':
            require_once __DIR__ . '/users.php';
            $controller = new UsersController($pdo);
            break;
        case 'patients':
            require_once __DIR__ . '/patients.php';
            $controller = new PatientsController($pdo);
            break;
        case 'medecins':
            require_once __DIR__ . '/medecins.php';
            $controller = new MedecinsController($pdo);
            break;
        case 'rendez_vous':
            require_once __DIR__ . '/rendez-vous.php';
            $controller = new RendezVousController($pdo);
            break;
        case 'profile':
            require_once __DIR__ . '/profile.php';
            $controller = new ProfileController($pdo);
            break;
        default:
            sendResponse(false, "Entité '$entity' inconnue.", null, 404);
    }

    // Exécution
    if (isset($controller)) {
        $controller->process($action, $id, $data);
    }
} catch (Exception $e) {
    sendResponse(false, "Erreur serveur : " . $e->getMessage(), null, 500);
}
