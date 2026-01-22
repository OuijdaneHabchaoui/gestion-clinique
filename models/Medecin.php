<?php
/**
 * Model Medecin
 * Gestion des opérations CRUD pour la table 'medecins'
 */

class Medecin
{
    private $pdo;
    private $table = 'medecins';

    public function __construct($pdo)
    {
        $this->pdo = $pdo;
    }

    /**
     * Récupère tous les médecins avec email
     */
    public function findAll($search = null, $specialite = null)
    {
        $sql = "SELECT m.*, u.email FROM {$this->table} m JOIN users u ON m.user_id = u.id WHERE 1=1";
        $params = [];

        if ($search) {
            $sql .= " AND (m.nom LIKE ? OR m.prenom LIKE ?)";
            $searchTerm = "%" . $search . "%";
            $params[] = $searchTerm;
            $params[] = $searchTerm;
        }

        if ($specialite) {
            $sql .= " AND m.specialite = ?";
            $params[] = $specialite;
        }

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    /**
     * Récupère un médecin par ID
     */
    public function findById($id)
    {
        $sql = "SELECT m.*, u.email FROM {$this->table} m JOIN users u ON m.user_id = u.id WHERE m.id = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$id]);
        return $stmt->fetch();
    }

    /**
     * Récupère un médecin par user_id
     */
    public function findByUserId($userId)
    {
        $stmt = $this->pdo->prepare("SELECT id, nom, prenom, specialite, telephone FROM {$this->table} WHERE user_id = ?");
        $stmt->execute([$userId]);
        return $stmt->fetch();
    }

    /**
     * Crée un nouveau médecin
     */
    public function create($data, $userId)
    {
        $stmt = $this->pdo->prepare(
            "INSERT INTO {$this->table} (user_id, nom, prenom, specialite, telephone) VALUES (?, ?, ?, ?, ?)"
        );
        $stmt->execute([
            $userId,
            $data['nom'],
            $data['prenom'],
            $data['specialite'] ?? null,
            $data['telephone'] ?? null
        ]);

        return $this->pdo->lastInsertId();
    }

    /**
     * Met à jour un médecin
     */
    public function update($id, $data)
    {
        $fields = [];
        $params = [];
        $allowed = ['nom', 'prenom', 'specialite', 'telephone'];

        foreach ($allowed as $field) {
            if (isset($data[$field])) {
                $fields[] = "$field = ?";
                $params[] = $data[$field];
            }
        }

        if (empty($fields)) {
            return false;
        }

        $params[] = $id;
        $sql = "UPDATE {$this->table} SET " . implode(", ", $fields) . " WHERE id = ?";
        $stmt = $this->pdo->prepare($sql);
        return $stmt->execute($params);
    }

    /**
     * Supprime un médecin
     */
    public function delete($id)
    {
        $stmt = $this->pdo->prepare("DELETE FROM {$this->table} WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    }
}

