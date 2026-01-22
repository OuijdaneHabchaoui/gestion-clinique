/**
 * Service API - Gestion de toutes les requêtes vers le backend
 * Architecture: Couche Model dans le pattern MVC
 */

class ApiService {
    constructor() {
        // Détection automatique de l'URL de l'API
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        const port = window.location.port;

        if (protocol === 'file:') {
            this.baseURL = 'http://localhost:8080/backend/controllers/index.php';
        } else {
            const portPart = port ? `:${port}` : '';
            this.baseURL = `${protocol}//${hostname}${portPart}/backend/controllers/index.php`;
        }

        console.log('🔗 API URL:', this.baseURL);

        this.currentUser = this.getUserFromStorage();
    }

    /**
     * Méthode générique pour faire des requêtes HTTP
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}?${endpoint}`;

        const config = {
            method: options.method || 'GET',
            headers: {
                ...options.headers
            }
        };

        // Pour POST/PUT avec JSON
        if (options.body && !(options.body instanceof FormData)) {
            config.headers['Content-Type'] = 'application/json';
            config.body = JSON.stringify(options.body);
        } else if (options.body) {
            // Pour FormData (upload de fichiers)
            config.body = options.body;
        }

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.message || 'Une erreur est survenue');
            }

            return data;
        } catch (error) {
            console.error('Erreur API:', error);
            throw error;
        }
    }

    // ==========================================
    // AUTHENTIFICATION
    // ==========================================

    /**
     * Connexion utilisateur
     */
    async login(email, password) {
        const data = await this.request('entity=auth&action=login', {
            method: 'POST',
            body: { email, mot_de_passe: password }
        });

        if (data.success) {
            this.saveUserToStorage(data.data);
            this.currentUser = data.data;
        }

        return data;
    }

    /**
     * Inscription utilisateur (Patient)
     */
    async register(userData) {
        // userData doit contenir: nom, prenom, email, mot_de_passe, telephone
        const data = await this.request('entity=auth&action=register', {
            method: 'POST',
            body: userData
        });

        if (data.success) {
            this.saveUserToStorage(data.data);
            this.currentUser = data.data;
        }

        return data;
    }

    /**
     * Déconnexion
     */
    logout() {
        localStorage.removeItem('clinic_user');
        sessionStorage.removeItem('clinic_user');
        this.currentUser = null;
        // Détection du chemin correct pour la redirection
        const path = window.location.pathname;
        if (path.includes('/pages/')) {
            window.location.href = '../index.html';
        } else {
            window.location.href = 'index.html';
        }
    }

    /**
     * Vérifier si l'utilisateur est connecté
     */
    isAuthenticated() {
        return this.currentUser !== null;
    }

    /**
     * Obtenir l'utilisateur actuel
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Sauvegarder l'utilisateur dans le stockage local
     */
    saveUserToStorage(user) {
        localStorage.setItem('clinic_user', JSON.stringify(user));
    }

    /**
     * Récupérer l'utilisateur depuis le stockage
     */
    getUserFromStorage() {
        const user = localStorage.getItem('clinic_user');
        return user ? JSON.parse(user) : null;
    }

    // ==========================================
    // PROFIL UTILISATEUR
    // ==========================================

    /**
     * Récupérer le profil complet
     */
    async getProfile(userId) {
        return await this.request(`entity=profile&action=get&id=${userId}`);
    }

    /**
     * Mettre à jour le profil
     */
    async updateProfile(userId, profileData) {
        return await this.request(`entity=profile&action=put&id=${userId}`, {
            method: 'PUT',
            body: profileData
        });
    }

    /**
     * Upload photo de profil
     */
    async uploadPhoto(userId, file) {
        const formData = new FormData();
        formData.append('photo', file);

        return await this.request(`entity=profile&action=upload_photo&id=${userId}`, {
            method: 'POST',
            body: formData
        });
    }

    // ==========================================
    // UTILISATEURS
    // ==========================================

    async getUsers() {
        return await this.request('entity=users&action=get');
    }

    async createUser(userData) {
        return await this.request('entity=users&action=post', {
            method: 'POST',
            body: userData
        });
    }

    async updateUser(id, userData) {
        return await this.request(`entity=users&action=put&id=${id}`, {
            method: 'PUT',
            body: userData
        });
    }

    // ==========================================
    // MÉDECINS
    // ==========================================

    async getMedecins() {
        return await this.request('entity=medecins&action=get');
    }

    async createMedecin(medecinData) {
        return await this.request('entity=medecins&action=post', {
            method: 'POST',
            body: medecinData
        });
    }

    async updateMedecin(id, medecinData) {
        return await this.request(`entity=medecins&action=put&id=${id}`, {
            method: 'PUT',
            body: medecinData
        });
    }

    async deleteMedecin(id) {
        return await this.request(`entity=medecins&action=delete&id=${id}`, {
            method: 'DELETE'
        });
    }

    // ==========================================
    // RENDEZ-VOUS
    // ==========================================

    async getRendezVous(filters = {}) {
        let endpoint = 'entity=rendez_vous&action=get';

        if (filters.patient_id) {
            endpoint += `&patient_id=${filters.patient_id}`;
        }
        if (filters.medecin_id) {
            endpoint += `&medecin_id=${filters.medecin_id}`;
        }
        if (filters.date) {
            endpoint += `&date=${filters.date}`;
        }

        return await this.request(endpoint);
    }

    async createRendezVous(rvData) {
        return await this.request('entity=rendez_vous&action=post', {
            method: 'POST',
            body: rvData
        });
    }

    async updateRendezVous(id, rvData) {
        return await this.request(`entity=rendez_vous&action=put&id=${id}`, {
            method: 'PUT',
            body: rvData
        });
    }
}

// Instance globale du service API
const api = new ApiService();
