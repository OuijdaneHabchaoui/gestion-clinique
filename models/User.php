<?php
/**
 * Model User
 * Gestion des opérations CRUD pour la table 'users'
 */

class User
{
    private $pdo;
    private $table = 'users';

    public function __construct($pdo)
    {
        $this->pdo = $pdo;
    }

    /**
     * Récupère tous les utilisateurs
     */
    public function findAll()
    {
        try {
            $sql = "SELECT 
                        u.id, u.email, u.role, u.actif, u.date_creation, u.derniere_connexion,
                        COALESCE(m.nom, p.nom) as nom,
                        COALESCE(m.prenom, p.prenom) as prenom
                    FROM {$this->table} u
                    LEFT JOIN medecins m ON u.id = m.user_id
                    LEFT JOIN patients p ON u.id = p.user_id
                    ORDER BY u.date_creation DESC";
            $stmt = $this->pdo->query($sql);
            return $stmt->fetchAll();
        } catch (PDOException $e) {
            // Fallback in case of error (e.g. missing columns/tables)
            $stmt = $this->pdo->query(
                "SELECT id, email, role, actif, date_creation, derniere_connexion FROM {$this->table} ORDER BY date_creation DESC"
            );
            return $stmt->fetchAll();
        }
    }

    /**
     * Récupère un utilisateur par ID
     */
    public function findById($id)
    {
        $stmt = $this->pdo->prepare(
            "SELECT id, email, role, actif, date_creation, derniere_connexion FROM {$this->table} WHERE id = ?"
        );
        $stmt->execute([$id]);
        return $stmt->fetch();
    }

    /**
     * Récupère un utilisateur par email (avec mot de passe pour auth)
     */
    public function findByEmail($email)
    {
        $stmt = $this->pdo->prepare("SELECT * FROM {$this->table} WHERE email = ?");
        $stmt->execute([$email]);
        return $stmt->fetch();
    }

    /**
     * Vérifie si un email existe déjà
     */
    public function emailExists($email, $excludeId = null)
    {
        if ($excludeId) {
            $stmt = $this->pdo->prepare("SELECT id FROM {$this->table} WHERE email = ? AND id != ?");
            $stmt->execute([$email, $excludeId]);
        } else {
            $stmt = $this->pdo->prepare("SELECT id FROM {$this->table} WHERE email = ?");
            $stmt->execute([$email]);
        }
        return $stmt->fetch() !== false;
    }

    /**
     * Crée un nouvel utilisateur
     */
    public function create($data)
    {
        $hashedPassword = password_hash($data['mot_de_passe'], PASSWORD_DEFAULT);
        $role = $data['role'] ?? 'patient';
        $actif = $data['actif'] ?? 1;

        $stmt = $this->pdo->prepare(
            "INSERT INTO {$this->table} (email, mot_de_passe, role, actif, date_creation) VALUES (?, ?, ?, ?, NOW())"
        );
        $stmt->execute([$data['email'], $hashedPassword, $role, $actif]);

        return $this->pdo->lastInsertId();
    }

    /**
     * Met à jour un utilisateur
     */
    public function update($id, $data)
    {
        $fields = [];
        $params = [];

        if (isset($data['email'])) {
            $fields[] = "email = ?";
            $params[] = $data['email'];
        }
        if (!empty($data['mot_de_passe'])) {
            $fields[] = "mot_de_passe = ?";
            $params[] = password_hash($data['mot_de_passe'], PASSWORD_DEFAULT);
        }
        if (isset($data['role'])) {
            $validRoles = ['admin', 'medecin', 'patient'];
            if (in_array($data['role'], $validRoles)) {
                $fields[] = "role = ?";
                $params[] = $data['role'];
            }
        }
        if (isset($data['actif'])) {
            $fields[] = "actif = ?";
            $params[] = $data['actif'];
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
     * Met à jour la dernière connexion
     */
    public function updateLastLogin($id)
    {
        $stmt = $this->pdo->prepare("UPDATE {$this->table} SET derniere_connexion = ? WHERE id = ?");
        return $stmt->execute([date('Y-m-d H:i:s'), $id]);
    }

    /**
     * Supprime un utilisateur
     */
    public function delete($id)
    {
        $stmt = $this->pdo->prepare("DELETE FROM {$this->table} WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    }

    /**
     * Vérifie si l'utilisateur est admin
     */
    public function isAdmin($id)
    {
        $stmt = $this->pdo->prepare("SELECT role FROM {$this->table} WHERE id = ? AND actif = 1");
        $stmt->execute([$id]);
        $user = $stmt->fetch();
        return $user && $user['role'] === 'admin';
    }
}
