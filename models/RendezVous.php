<?php
/**
 * Model RendezVous
 * Gestion des opérations CRUD pour la table 'rendez_vous'
 */

class RendezVous
{
    private $pdo;
    private $table = 'rendez_vous';

    public function __construct($pdo)
    {
        $this->pdo = $pdo;
    }

    /**
     * Récupère tous les rendez-vous avec infos patient et médecin
     */
    public function findAll($filters = [])
    {
        $sql = "SELECT rv.*, 
                p.nom as patient_nom, p.prenom as patient_prenom,
                m.nom as medecin_nom, m.prenom as medecin_prenom, m.specialite
                FROM {$this->table} rv
                LEFT JOIN patients p ON rv.patient_id = p.id
                LEFT JOIN medecins m ON rv.medecin_id = m.id
                WHERE 1=1";
        $params = [];

        if (!empty($filters['patient_id'])) {
            $sql .= " AND rv.patient_id = ?";
            $params[] = $filters['patient_id'];
        }

        if (!empty($filters['medecin_id'])) {
            $sql .= " AND rv.medecin_id = ?";
            $params[] = $filters['medecin_id'];
        }

        if (!empty($filters['statut'])) {
            $sql .= " AND rv.statut = ?";
            $params[] = $filters['statut'];
        }

        if (!empty($filters['date'])) {
            $sql .= " AND DATE(rv.date_rendez_vous) = ?";
            $params[] = $filters['date'];
        }

        $sql .= " ORDER BY rv.date_rendez_vous DESC";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    /**
     * Récupère un rendez-vous par ID
     */
    public function findById($id)
    {
        $sql = "SELECT rv.*, 
                p.nom as patient_nom, p.prenom as patient_prenom,
                m.nom as medecin_nom, m.prenom as medecin_prenom, m.specialite
                FROM {$this->table} rv
                LEFT JOIN patients p ON rv.patient_id = p.id
                LEFT JOIN medecins m ON rv.medecin_id = m.id
                WHERE rv.id = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$id]);
        return $stmt->fetch();
    }

    /**
     * Récupère les rendez-vous d'un médecin
     */
    public function findByMedecinId($medecinId)
    {
        return $this->findAll(['medecin_id' => $medecinId]);
    }

    /**
     * Crée un nouveau rendez-vous
     */
    public function create($data)
    {
        $stmt = $this->pdo->prepare(
            "INSERT INTO {$this->table} (patient_id, medecin_id, date_rendez_vous, type_consultation, prix, montant_paye, mode_paiement, statut, motif) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
        );
        $stmt->execute([
            $data['patient_id'],
            $data['medecin_id'],
            $data['date_rendez_vous'],
            $data['type_consultation'] ?? 'medecine_generale',
            $data['prix'] ?? 300.00,
            $data['montant_paye'] ?? 0.00,
            $data['mode_paiement'] ?? 'especes',
            $data['statut'] ?? 'en_attente',
            $data['motif'] ?? null
        ]);

        return $this->pdo->lastInsertId();
    }

    /**
     * Met à jour un rendez-vous
     */
    public function update($id, $data)
    {
        $fields = [];
        $params = [];
        $allowed = ['date_rendez_vous', 'motif', 'statut', 'medecin_id'];

        foreach ($allowed as $field) {
            if (isset($data[$field])) {
                if ($field === 'statut') {
                    $validStatus = ['en_attente', 'confirme', 'annule', 'termine'];
                    if (!in_array($data[$field], $validStatus)) {
                        throw new Exception("Statut invalide");
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
     * Supprime un rendez-vous
     */
    public function delete($id)
    {
        $stmt = $this->pdo->prepare("DELETE FROM {$this->table} WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    }

    /**
     * Compte le nombre de rendez-vous pour un médecin à une date donnée
     */
    public function countDailyAppointments($medecinId, $date)
    {
        // $date doit être au format YYYY-MM-DD
        $realDate = date('Y-m-d', strtotime($date));
        $sql = "SELECT COUNT(*) FROM {$this->table} 
                WHERE medecin_id = ? AND DATE(date_rendez_vous) = ? AND statut != 'annule'";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$medecinId, $realDate]);
        return $stmt->fetchColumn();
    }

    /**
     * Vérifie la disponibilité d'un créneau
     */
    public function isSlotAvailable($medecinId, $dateRendezVous, $excludeId = null)
    {
        $sql = "SELECT id FROM {$this->table} 
                WHERE medecin_id = ? AND date_rendez_vous = ? AND statut != 'annule'";
        $params = [$medecinId, $dateRendezVous];

        if ($excludeId) {
            $sql .= " AND id != ?";
            $params[] = $excludeId;
        }

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetch() === false;
    }
}
