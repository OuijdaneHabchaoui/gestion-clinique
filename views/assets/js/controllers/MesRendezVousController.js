/**
 * Controller pour la page "Mes Rendez-vous" (Espace Patient)
 */
class MesRendezVousController {
    constructor() {
        this.user = api.getCurrentUser();
        if (!this.user || this.user.role !== 'patient') {
            window.location.href = 'login.html';
            return;
        }

        this.tableBody = document.getElementById('rdvTableBody');
        this.modal = document.getElementById('rdvModal');
        this.form = document.getElementById('rdvForm');
        this.patientIdInput = document.getElementById('rdvPatientId');
        this.medecinSelect = document.getElementById('medecinSelect');

        this.init();
    }

    async init() {
        this.renderMenu();
        this.updateHeader();
        this.setupEventListeners();
        await this.loadMedecins();
        await this.loadRendezVous();

        // Pré-remplir l'ID patient si dispo
        if (this.user.profile_id) {
            this.patientIdInput.value = this.user.profile_id;
        } else if (this.user.patient_infos) {
            this.patientIdInput.value = this.user.patient_infos.id;
        }
    }

    renderMenu() {
        const menuContainer = document.getElementById('sidebarMenu');
        if (!menuContainer) return;

        let html = `
            <a href="dashboard.html" class="menu-item">
                <i class="fas fa-chart-line"></i>
                <span>Tableau de bord</span>
            </a>
            <a href="mes-rendez-vous.html" class="menu-item active">
                <i class="fas fa-calendar-check"></i>
                <span>Mes Rendez-vous</span>
            </a>
            <a href="profile.html" class="menu-item">
                <i class="fas fa-user-circle"></i>
                <span>Mon Profil</span>
            </a>
        `;

        menuContainer.innerHTML = html;
    }

    updateHeader() {
        const name = this.user.prenom && this.user.nom ?
            `${this.user.prenom} ${this.user.nom}` :
            (this.user.patient_infos ? `${this.user.patient_infos.prenom} ${this.user.patient_infos.nom}` : this.user.email);

        const headerName = document.getElementById('headerUserName');
        const headerRole = document.getElementById('headerUserRole');
        const headerAvatar = document.getElementById('headerAvatar');

        if (headerName) headerName.textContent = name;
        if (headerRole) headerRole.textContent = this.user.role;
        if (headerAvatar) headerAvatar.textContent = name.charAt(0).toUpperCase();
    }

    setupEventListeners() {
        // Modal
        document.getElementById('btnNewRdv').addEventListener('click', () => {
            this.openModal();
        });

        document.querySelectorAll('.close-modal, .close-modal-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.modal.style.display = 'none';
            });
        });

        window.onclick = (event) => {
            if (event.target == this.modal) {
                this.modal.style.display = 'none';
            }
        };

        // Soumission Formulaire
        this.form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleSave();
        });

        // Logout sidebar
        document.getElementById('sidebarLogout').addEventListener('click', (e) => {
            e.preventDefault();
            api.logout();
        });
    }

    async loadMedecins() {
        try {
            const response = await api.getMedecins();
            if (response.success) {
                this.medecinSelect.innerHTML = '<option value="">Choisir un médecin...</option>' +
                    response.data.map(m => `<option value="${m.id}">Dr. ${m.prenom} ${m.nom} (${m.specialite})</option>`).join('');
            }
        } catch (error) {
            console.error("Erreur chargement médecins:", error);
        }
    }

    async loadRendezVous() {
        if (!this.user.profile_id && !this.user.patient_infos) {
            console.warn("Profil patient introuvable");
            return;
        }

        const patientId = this.user.profile_id || this.user.patient_infos.id;

        try {
            const response = await api.getRendezVous({ patient_id: patientId });
            if (response.success) {
                this.renderTable(response.data);
            }
        } catch (error) {
            this.tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-error">Erreur de chargement</td></tr>`;
        }
    }

    renderTable(data) {
        if (!data || data.length === 0) {
            this.tableBody.innerHTML = `<tr><td colspan="6" class="text-center">Aucun rendez-vous trouvé.</td></tr>`;
            return;
        }

        this.tableBody.innerHTML = data.map(rv => `
            <tr>
                <td>${new Date(rv.date_rendez_vous).toLocaleString('fr-FR')}</td>
                <td>${rv.patient_nom || ''} ${rv.patient_prenom || ''}</td>
                <td>Dr. ${rv.medecin_nom || '-'}</td>
                <td>${rv.specialite || '-'}</td>
                <td>${rv.motif || '-'}</td>
                <td><span class="badge ${this.getStatusBadgeClass(rv.statut)}">${rv.statut}</span></td>
                <td>
                    ${rv.statut === 'en_attente' ?
                `<button class="btn btn-sm btn-danger btn-cancel" data-id="${rv.id}"><i class="fas fa-times"></i> Annuler</button>`
                : ''}
                </td>
            </tr>
        `).join('');

        // Attacher events annulation
        document.querySelectorAll('.btn-cancel').forEach(btn => {
            btn.addEventListener('click', (e) => this.cancelRendezVous(e.target.closest('button').dataset.id));
        });
    }

    getStatusBadgeClass(status) {
        switch (status) {
            case 'en_attente': return 'badge-warning';
            case 'confirme': return 'badge-success';
            case 'annule': return 'badge-error';
            case 'termine': return 'badge-secondary';
            default: return 'badge-info';
        }
    }

    async handleSave() {
        const formData = new FormData(this.form);
        const data = Object.fromEntries(formData.entries());

        // S'assurer que le patient_id est bien là
        if (!data.patient_id) {
            data.patient_id = this.user.profile_id || this.user.patient_infos.id;
        }

        try {
            // Création
            const res = await api.createRendezVous(data);
            if (res.success) {
                this.modal.style.display = 'none';
                this.form.reset();
                await this.loadRendezVous();
                this.showAlert('✅ Demande de rendez-vous envoyée avec succès !', 'success');
            }
        } catch (error) {
            this.showAlert('❌ ' + error.message, 'error');
        }
    }

    async cancelRendezVous(id) {
        if (confirm('Voulez-vous vraiment annuler ce rendez-vous ?')) {
            try {
                await api.updateRendezVous(id, { statut: 'annule' });
                await this.loadRendezVous();
                this.showAlert('✅ Rendez-vous annulé', 'success');
            } catch (error) {
                this.showAlert('❌ ' + error.message, 'error');
            }
        }
    }

    openModal() {
        this.form.reset();
        this.patientIdInput.value = this.user.profile_id || (this.user.patient_infos ? this.user.patient_infos.id : '');
        this.modal.style.display = 'block';
    }

    showAlert(message, type = 'error') {
        const alertDiv = document.getElementById('alertMessage');
        if (!alertDiv) return;

        const isSuccess = type === 'success';
        alertDiv.innerHTML = `<i class="fas fa-${isSuccess ? 'check-circle' : 'exclamation-circle'}"></i> ${message}`;
        alertDiv.className = `alert alert-${type}`;
        alertDiv.style.cssText = `
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 16px 20px;
            border-radius: 12px;
            margin-bottom: 20px;
            font-weight: 500;
            animation: slideIn 0.3s ease;
            background: ${isSuccess ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'};
            border: 1px solid ${isSuccess ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'};
            color: ${isSuccess ? '#10b981' : '#ef4444'};
        `;

        // Auto-hide after 5 seconds
        setTimeout(() => {
            alertDiv.style.display = 'none';
        }, 5000);
    }
}

