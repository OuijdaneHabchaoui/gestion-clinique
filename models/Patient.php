<?php
/**
 * Model Patient
 * Gestion des opérations CRUD pour la table 'patients'
 */

class Patient
{
    private $pdo;
    private $table = 'patients';

    public function __construct($pdo)
    {
        $this->pdo = $pdo;
    }

    /**
     * Récupère tous les patients avec email
     */
    public function findAll($search = null)
    {
        $sql = "SELECT p.*, u.email FROM {$this->table} p JOIN users u ON p.user_id = u.id";

        if ($search) {
            $sql .= " WHERE p.nom LIKE ? OR p.prenom LIKE ?";
            $stmt = $this->pdo->prepare($sql);
            $searchTerm = "%" . $search . "%";
            $stmt->execute([$searchTerm, $searchTerm]);
        } else {
            $stmt = $this->pdo->query($sql);
        }

        return $stmt->fetchAll();
    }

    /**
     * Récupère un patient par ID avec détails complets
     */
    public function findById($id)
    {
        $sql = "SELECT p.*, u.email FROM {$this->table} p JOIN users u ON p.user_id = u.id WHERE p.id = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$id]);
        return $stmt->fetch();
    }

    /**
     * Récupère un patient par user_id
     */
    public function findByUserId($userId)
    {
        $stmt = $this->pdo->prepare("SELECT id, nom, prenom, telephone, date_naissance, adresse, groupe_sanguin, photo FROM {$this->table} WHERE user_id = ?");
        $stmt->execute([$userId]);
        return $stmt->fetch();
    }

    /**
     * Récupère le user_id d'un patient
     */
    public function getUserId($patientId)
    {
        $stmt = $this->pdo->prepare("SELECT user_id FROM {$this->table} WHERE id = ?");
        $stmt->execute([$patientId]);
        $result = $stmt->fetch();
        return $result ? $result['user_id'] : null;
    }



    /**
     * Récupère les rendez-vous d'un patient
     */
    public function getRendezVous($patientId)
    {
        $stmt = $this->pdo->prepare(
            "SELECT * FROM rendez_vous WHERE patient_id = ? ORDER BY date_rendez_vous DESC"
        );
        $stmt->execute([$patientId]);
        return $stmt->fetchAll();
    }

    /**
     * Crée un nouveau patient
     */
    public function create($data, $userId)
    {
        $stmt = $this->pdo->prepare(
            "INSERT INTO {$this->table} (user_id, nom, prenom, date_naissance, telephone, adresse, groupe_sanguin) 
             VALUES (?, ?, ?, ?, ?, ?, ?)"
        );
        $stmt->execute([
            $userId,
            $data['nom'],
            $data['prenom'],
            $data['date_naissance'] ?? null,
            $data['telephone'] ?? null,
            $data['adresse'] ?? null,
            $data['groupe_sanguin'] ?? null
        ]);

        return $this->pdo->lastInsertId();
    }

    /**
     * Met à jour un patient
     */
    public function update($id, $data)
    {
        $fields = [];
        $params = [];
        $allowed = ['nom', 'prenom', 'date_naissance', 'telephone', 'adresse', 'groupe_sanguin', 'photo'];

        foreach ($allowed as $field) {
            if (isset($data[$field])) {
                if ($field === 'groupe_sanguin') {
                    $validBlood = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
                    if (!in_array($data[$field], $validBlood)) {
                        throw new Exception("Groupe sanguin invalide");
                    }
                }
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
     * Supprime un patient
     */
    public function delete($id)
    {
        $stmt = $this->pdo->prepare("DELETE FROM {$this->table} WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    }
}
