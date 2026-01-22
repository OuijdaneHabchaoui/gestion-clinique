/**
 * PatientsController
 * Gère la liste et l'édition des patients
 */

class PatientsController {
    constructor() {
        this.user = null;
        this.patients = [];
        this.modal = null;
    }

    async init() {
        this.user = api.getCurrentUser();
        // Vérification des droits (Admin ou Réceptionniste ou Médecin)
        if (!this.user || !['admin', 'medecin'].includes(this.user.role)) {
            window.location.href = 'dashboard.html';
            return;
        }

        this.modal = document.getElementById('patientModal');
        this.updateHeader();
        this.renderMenu();
        await this.loadPatients();
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
                <a href="patients.html" class="menu-item active">
                    <i class="fas fa-users"></i>
                    <span>Patients</span>
                </a>
                <a href="medecins.html" class="menu-item">
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

    async loadPatients() {
        try {
            const response = await api.request('entity=patients&action=get');
            if (response.success) {
                this.patients = response.data;
                this.renderTable(this.patients);
            }
        } catch (error) {
            this.showAlert('Erreur chargement: ' + error.message, 'error');
        }
    }

    renderTable(data) {
        const tbody = document.getElementById('patientsTableBody');

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center py-xl">Aucun patient trouvé</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(patient => `
            <tr>
                <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div class="user-avatar" style="width: 30px; height: 30px; font-size: 0.8rem;">
                            ${patient.photo ? `<img src="${window.location.origin}/backend/${patient.photo}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">` : (patient.prenom ? patient.prenom.charAt(0) : 'P')}
                        </div>
                        <div>
                            <div class="font-bold">${patient.nom} ${patient.prenom}</div>
                            <small class="text-muted">Né le ${patient.date_naissance || '?'}</small>
                        </div>
                    </div>
                </td>
                <td>${patient.email || '-'}</td>
                <td>${patient.telephone || '-'}</td>
                <td><span class="badge badge-outline">${patient.groupe_sanguin || '?'}</span></td>
                <td>
                    <button class="btn-icon" onclick="controller.editPatient(${patient.id})" title="Modifier">
                        <i class="fas fa-edit text-primary"></i>
                    </button>
                    ${this.user.role === 'admin' ? `
                    <button class="btn-icon" onclick="controller.deletePatient(${patient.id})" title="Supprimer">
                        <i class="fas fa-trash text-error"></i>
                    </button>` : ''}
                </td>
            </tr>
        `).join('');
    }

    // Gestion de la Modale
    openModal(mode = 'create', data = null) {
        this.modal.style.display = 'flex';
        this.modal.classList.add('active');
        const form = document.getElementById('patientForm');
        form.reset();

        document.getElementById('modalTitle').textContent = mode === 'create' ? 'Nouveau Patient' : 'Modifier Patient';
        document.getElementById('patientId').value = data ? data.id : '';

        if (data) {
            form.nom.value = data.nom;
            form.prenom.value = data.prenom;
            form.email.value = data.email || '';
            form.telephone.value = data.telephone;
            form.date_naissance.value = data.date_naissance;
            form.adresse.value = data.adresse || '';
            form.groupe_sanguin.value = data.groupe_sanguin;
        }
    }

    closeModal() {
        this.modal.style.display = 'none';
        this.modal.classList.remove('active');
    }

    // Actions
    editPatient(id) {
        const patient = this.patients.find(p => p.id === id);
        if (patient) {
            this.openModal('edit', patient);
        }
    }

    async deletePatient(id) {
        if (confirm('Êtes-vous sûr de vouloir supprimer ce patient ?')) {
            try {
                const response = await api.request(`entity=patients&action=delete&id=${id}`, { method: 'DELETE' });
                if (response.success) {
                    this.showAlert('Patient supprimé', 'success');
                    this.loadPatients();
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
            const filtered = this.patients.filter(p =>
                (p.nom && p.nom.toLowerCase().includes(term)) ||
                (p.prenom && p.prenom.toLowerCase().includes(term)) ||
                (p.email && p.email.toLowerCase().includes(term))
            );
            this.renderTable(filtered);
        });

        // Modale
        document.getElementById('btnAddPatient').addEventListener('click', () => this.openModal('create'));
        document.getElementById('btnCloseModal').addEventListener('click', () => this.closeModal());
        document.getElementById('btnCancel').addEventListener('click', () => this.closeModal());

        // Soumission Formulaire
        document.getElementById('patientForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleSave();
        });
    }

    async handleSave() {
        const form = document.getElementById('patientForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        const id = data.id;

        try {
            let response;
            if (id) {
                // Modification
                response = await api.request(`entity=patients&action=put&id=${id}`, {
                    method: 'PUT',
                    body: data
                });
            } else {
                // Création
                data.role = 'patient';
                response = await api.request('entity=patients&action=post', {
                    method: 'POST',
                    body: data
                });
            }

            if (response.success) {
                this.showAlert('Patient enregistré avec succès', 'success');
                this.closeModal();
                this.loadPatients();
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
