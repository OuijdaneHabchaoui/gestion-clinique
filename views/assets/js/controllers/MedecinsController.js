/**
 * MedecinsController
 * Gère la liste et l'édition des médecins
 */

class MedecinsController {
    constructor() {
        this.user = null;
        this.medecins = [];
        this.modal = null;
    }

    async init() {
        this.user = api.getCurrentUser();
        // Vérification des droits (Admin uniquement)
        if (!this.user || this.user.role !== 'admin') {
            window.location.href = 'dashboard.html';
            return;
        }

        this.modal = document.getElementById('medecinModal');
        this.updateHeader();
        this.renderMenu();
        await this.loadMedecins();
        this.attachEvents();
    }

    renderMenu() {
        const menuContainer = document.getElementById('sidebarMenu');
        if (!menuContainer) return;

        const role = this.user.role;
        let html = '';

        // 1. Dashboard
        html += `
            <a href="dashboard.html" class="menu-item">
                <i class="fas fa-chart-line"></i>
                <span>Tableau de bord</span>
            </a>
        `;

        // 2. Admin: Patients, Médecins
        if (role === 'admin') {
            html += `
                <a href="patients.html" class="menu-item">
                    <i class="fas fa-users"></i>
                    <span>Patients</span>
                </a>
                <a href="medecins.html" class="menu-item active">
                    <i class="fas fa-user-md"></i>
                    <span>Médecins</span>
                </a>
            `;
        }

        // 3. Rendez-vous
        html += `
            <a href="rendez-vous.html" class="menu-item">
                <i class="fas fa-calendar-alt"></i>
                <span>Rendez-vous</span>
            </a>
        `;

        // 4. Utilisateurs (Admin only)
        if (role === 'admin') {
            html += `
                <a href="utilisateurs.html" class="menu-item">
                    <i class="fas fa-user-shield"></i>
                    <span>Utilisateurs</span>
                </a>
            `;
        }

        menuContainer.innerHTML = html;
    }

    updateHeader() {
        const name = this.user.prenom && this.user.nom ? `${this.user.prenom} ${this.user.nom}` : this.user.email;
        document.getElementById('headerUserName').textContent = name;
        document.getElementById('headerUserRole').textContent = this.user.role;

        const avatar = document.getElementById('headerAvatar');
        if (this.user.photo) {
            const rootPath = window.location.origin + '/backend/';
            avatar.innerHTML = `<img src="${rootPath + this.user.photo}" class="user-avatar" alt="Avatar">`;
        } else {
            avatar.textContent = name.charAt(0).toUpperCase();
        }
    }

    async loadMedecins() {
        try {
            const response = await api.getMedecins();
            if (response.success) {
                this.medecins = response.data;
                this.renderTable(this.medecins);
            }
        } catch (error) {
            this.showAlert('Erreur chargement: ' + error.message, 'error');
        }
    }

    renderTable(data) {
        const tbody = document.getElementById('medecinsTableBody');

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center py-xl">Aucun médecin trouvé</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(medecin => `
            <tr>
                <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div class="user-avatar" style="width: 30px; height: 30px; font-size: 0.8rem;">
                            ${medecin.photo ? `<img src="${window.location.origin}/backend/${medecin.photo}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">` : (medecin.prenom ? medecin.prenom.charAt(0) : 'D')}
                        </div>
                        <div>
                            <div class="font-bold">${medecin.nom} ${medecin.prenom}</div>
                        </div>
                    </div>
                </td>
                <td><span class="badge badge-outline">${medecin.specialite || 'Généraliste'}</span></td>
                <td>${medecin.email || '-'}</td>
                <td>${medecin.telephone || '-'}</td>
                <td>
                    <button class="btn-icon" onclick="controller.editMedecin(${medecin.id})" title="Modifier">
                        <i class="fas fa-edit text-primary"></i>
                    </button>
                    <button class="btn-icon" onclick="controller.deleteMedecin(${medecin.id})" title="Supprimer">
                        <i class="fas fa-trash text-error"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    // Gestion de la Modale
    openModal(mode = 'create', data = null) {
        this.modal.style.display = 'flex';
        this.modal.classList.add('active');
        const form = document.getElementById('medecinForm');
        form.reset();

        document.getElementById('modalTitle').textContent = mode === 'create' ? 'Nouveau Médecin' : 'Modifier Médecin';
        document.getElementById('medecinId').value = data ? data.id : '';

        if (data) {
            form.nom.value = data.nom;
            form.prenom.value = data.prenom;
            form.email.value = data.email || '';
            form.telephone.value = data.telephone;
            form.specialite.value = data.specialite;
            // Mot de passe non rempli lors de l'édition
        }
    }

    closeModal() {
        this.modal.style.display = 'none';
        this.modal.classList.remove('active');
    }

    // Actions
    editMedecin(id) {
        const medecin = this.medecins.find(m => m.id === id);
        if (medecin) {
            this.openModal('edit', medecin);
        }
    }

    async deleteMedecin(id) {
        if (confirm('Êtes-vous sûr de vouloir supprimer ce médecin ?')) {
            try {
                const response = await api.deleteMedecin(id);
                if (response.success) {
                    this.showAlert('Médecin supprimé', 'success');
                    this.loadMedecins();
                }
            } catch (error) {
                this.showAlert(error.message, 'error');
            }
        }
    }

    attachEvents() {
        // Logout
        document.getElementById('btnLogout').addEventListener('click', () => api.logout());

        // Recherche
        document.getElementById('searchInput').addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = this.medecins.filter(m =>
                (m.nom && m.nom.toLowerCase().includes(term)) ||
                (m.prenom && m.prenom.toLowerCase().includes(term)) ||
                (m.email && m.email.toLowerCase().includes(term)) ||
                (m.specialite && m.specialite.toLowerCase().includes(term))
            );
            this.renderTable(filtered);
        });

        // Modale
        document.getElementById('btnAddMedecin').addEventListener('click', () => this.openModal('create'));
        document.getElementById('btnCloseModal').addEventListener('click', () => this.closeModal());
        document.getElementById('btnCancel').addEventListener('click', () => this.closeModal());

        // Soumission Formulaire
        document.getElementById('medecinForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleSave();
        });
    }

    async handleSave() {
        const form = document.getElementById('medecinForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        const id = data.id;

        try {
            let response;
            if (id) {
                // Modification
                response = await api.updateMedecin(id, data);
            } else {
                // Création
                // Pour créer un médecin, il faut normalement créer un user associé.
                // Ici, on suppose que l'API createMedecin gère tout ou on le fait en 2 étapes ? 
                // Le endpoint updateMedecin/createMedecin dans le backend PHP semble gérer la table medecins.
                // S'il faut aussi un user, c'est plus complexe. 
                // MAIS l'utilisateur a demandé un formulaire dans medecins.html comme patients.html.
                // On va utiliser api.createMedecin et on verra.
                response = await api.createMedecin(data);
            }

            if (response.success) {
                this.showAlert('Médecin enregistré avec succès', 'success');
                this.closeModal();
                this.loadMedecins();
            }
        } catch (error) {
            this.showAlert(error.message, 'error');
        }
    }

    showAlert(message, type = 'error') {
        const el = document.getElementById('alertMessage');
        el.className = `alert alert-${type}`;
        el.innerHTML = `<span>${message}</span>`;
        el.classList.remove('hidden');
        setTimeout(() => el.classList.add('hidden'), 5000);
    }
}
