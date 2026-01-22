/**
 * RendezVousController
 * Gère le planning et la prise de RDV
 */

class RendezVousController {
    constructor() {
        this.user = null;
        this.appointments = [];
        this.modal = null;
    }

    async init() {
        this.user = api.getCurrentUser();
        if (!this.user) {
            window.location.href = 'login.html';
            return;
        }

        this.modal = document.getElementById('rdvModal');
        this.updateHeader();
        this.renderMenu();

        // Charger les RDV
        await this.loadAppointments();

        // Si admin, charger aussi les listes pour le formulaire
        if (this.user.role === 'admin') {
            await Promise.all([
                this.loadPatientsList(),
                this.loadMedecinsList()
            ]);
        } else {
            // Médecin: cacher complètement la modal
            if (this.modal) {
                this.modal.style.display = 'none';
            }
        }

        this.attachEvents();

        // Date du jour par défaut
        document.getElementById('dateFilter').valueAsDate = new Date();
    }

    renderMenu() {
        const menuContainer = document.getElementById('sidebarMenu');
        if (!menuContainer) return;

        const role = this.user.role;
        let html = '';

        // 1. Dashboard (Commun à tous)
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
                <a href="medecins.html" class="menu-item">
                    <i class="fas fa-user-md"></i>
                    <span>Médecins</span>
                </a>
            `;
        }

        // 3. Rendez-vous (Admin + Médecin) - ACTIVE sur cette page
        if (role === 'admin' || role === 'medecin') {
            html += `
                <a href="rendez-vous.html" class="menu-item active">
                    <i class="fas fa-calendar-alt"></i>
                    <span>Rendez-vous</span>
                </a>
            `;
        }

        // 4. Utilisateurs (Admin only)
        if (role === 'admin') {
            html += `
                <a href="utilisateurs.html" class="menu-item">
                    <i class="fas fa-user-shield"></i>
                    <span>Utilisateurs</span>
                </a>
            `;
        }

        // 5. Mon Profil (Commun à tous)
        html += `
            <a href="profile.html" class="menu-item">
                <i class="fas fa-user-circle"></i>
                <span>Mon Profil</span>
            </a>
        `;

        menuContainer.innerHTML = html;
    }



    async deleteRDV(id) {
        this.showConfirm("Voulez-vous vraiment annuler ce rendez-vous ?", async () => {
            try {
                const response = await api.updateRendezVous(id, { statut: 'annule' });
                if (response.success) {
                    this.showAlert("Rendez-vous annulé", "success");
                    this.loadAppointments();
                } else {
                    console.warn("Update échoué, tentative de suppression");
                    const delResponse = await api.request(`entity=rendez_vous&action=delete&id=${id}`, { method: 'DELETE' });
                    if (delResponse.success) {
                        this.showAlert("Rendez-vous supprimé", "success");
                        this.loadAppointments();
                    }
                }
            } catch (error) {
                this.showAlert(error.message, 'error');
            }
        });
    }

    async terminerRDV(id) {
        this.showConfirm("Confirmer que la consultation est terminée ?", async () => {
            try {
                const response = await api.updateRendezVous(id, { statut: 'termine' });
                if (response.success) {
                    this.showAlert("✅ Consultation terminée", "success");
                    this.loadAppointments();
                }
            } catch (error) {
                this.showAlert(error.message, 'error');
            }
        });
    }

    showConfirm(message, onConfirm) {
        const modal = document.getElementById('confirmationModal');
        const msgEl = document.getElementById('confirmationMessage');
        const btnConfirm = document.getElementById('btnConfirmAction');
        const btnCancel = document.getElementById('btnCancelConfirm');
        const btnClose = document.getElementById('btnCloseConfirm');

        if (!modal) {
            // Fallback si modal absente
            if (confirm(message)) onConfirm();
            return;
        }

        msgEl.textContent = message;
        modal.style.display = 'block';

        // Nettoyage des anciens event listeners pour éviter les appels multiples
        const newBtnConfirm = btnConfirm.cloneNode(true);
        btnConfirm.parentNode.replaceChild(newBtnConfirm, btnConfirm);

        const closeModal = () => {
            modal.style.display = 'none';
        };

        newBtnConfirm.addEventListener('click', () => {
            closeModal();
            onConfirm();
        });

        // Gestion fermeture
        btnCancel.onclick = closeModal;
        btnClose.onclick = closeModal;

        // Fermeture au clic dehors
        window.onclick = (event) => {
            if (event.target == modal) {
                closeModal();
            }
        };
    }

    updateHeader() {
        const name = this.user.prenom && this.user.nom ? `${this.user.prenom} ${this.user.nom}` : this.user.email;
        document.getElementById('headerUserName').textContent = name;
        document.getElementById('headerUserRole').textContent = this.user.role;

        const avatar = document.getElementById('headerAvatar');
        if (this.user.photo) {
            // Chemin relatif vers le dossier backend depuis /views/pages/
            const photoPath = '../../' + this.user.photo;
            avatar.innerHTML = `<img src="${photoPath}" class="user-avatar" alt="Avatar">`;
        } else {
            avatar.textContent = name.charAt(0).toUpperCase();
        }
    }

    async loadAppointments() {
        try {
            let endpoint = 'entity=rendez_vous&action=get';

            // Si médecin, filtrer par son ID
            if (this.user.role === 'medecin' && this.user.profile_id) {
                endpoint += `&medecin_id=${this.user.profile_id}`;
            }

            const response = await api.request(endpoint);
            if (response.success) {
                this.appointments = response.data;
                this.renderTable(this.appointments);
            }
        } catch (error) {
            console.error(error);
            this.showAlert("Erreur chargement RDV", "error");
        }
    }

    async loadPatientsList() {
        try {
            const response = await api.request('entity=patients&action=get');
            if (response.success) {
                const select = document.getElementById('patientSelect');
                select.innerHTML = '<option value="">Choisir un patient...</option>' +
                    response.data.map(p => `<option value="${p.id}">${p.nom} ${p.prenom}</option>`).join('');
            }
        } catch (e) {
            console.error("Erreur chargement patients", e);
        }
    }

    async loadMedecinsList() {
        try {
            const response = await api.request('entity=medecins&action=get');
            if (response.success) {
                const select = document.getElementById('medecinSelect');
                select.innerHTML = '<option value="">Choisir un médecin...</option>' +
                    response.data.map(m => `<option value="${m.id}">Dr. ${m.nom} ${m.prenom} (${m.specialite})</option>`).join('');
            }
        } catch (e) {
            console.error("Erreur chargement médecins", e);
        }
    }

    renderTable(data) {
        const tbody = document.getElementById('rdvTableBody');
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center py-xl text-muted">Aucun rendez-vous trouvé</td></tr>';
            return;
        }

        // Trier par date (plus récent en haut)
        data.sort((a, b) => new Date(b.date_rendez_vous) - new Date(a.date_rendez_vous));

        tbody.innerHTML = data.map(rdv => {
            const dateObj = new Date(rdv.date_rendez_vous);
            const dateStr = dateObj.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
            const timeStr = dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

            // Boutons d'action selon le rôle et le statut
            let actionButtons = '';

            // Admin peut annuler (seulement si pas déjà terminé ou annulé)
            if (this.user.role === 'admin' && rdv.statut !== 'termine' && rdv.statut !== 'annule') {
                actionButtons += `
                    <button class="btn-icon text-error" onclick="controller.deleteRDV(${rdv.id})" title="Annuler">
                        <i class="fas fa-times"></i>
                    </button>`;
            }

            // Médecin peut marquer comme terminé (si pas déjà terminé ou annulé)
            if (this.user.role === 'medecin' && rdv.statut !== 'termine' && rdv.statut !== 'annule') {
                actionButtons += `
                    <button class="btn btn-sm btn-success" onclick="controller.terminerRDV(${rdv.id})" title="Marquer comme terminé">
                        <i class="fas fa-check"></i> Terminer
                    </button>`;
            }

            // Si terminé, afficher un badge
            if (rdv.statut === 'termine') {
                actionButtons += '<span class="text-muted"><i class="fas fa-check-double"></i> Fait</span>';
            }

            return `
            <tr>
                <td>
                    <div class="font-bold">${dateStr}</div>
                    <div class="text-sm text-muted">${timeStr}</div>
                </td>
                <td class="font-medium">${rdv.patient_nom || ''} ${rdv.patient_prenom || ''}</td>
                <td>
                    <div class="text-sm">Dr. ${rdv.medecin_nom || ''} ${rdv.medecin_prenom || ''}</div>
                    <div class="text-xs text-muted">${rdv.specialite || ''}</div>
                </td>
                <td>${rdv.motif || '-'}</td>
                <td><span class="status-badge status-${rdv.statut.toLowerCase()}">${rdv.statut}</span></td>
                <td>${actionButtons}</td>
            </tr>
            `;
        }).join('');
    }

    attachEvents() {
        // Logout
        document.getElementById('btnLogout').addEventListener('click', () => api.logout());

        // Modal - Afficher le bouton seulement pour admin
        const btnNewRDV = document.getElementById('btnNewRDV');
        if (this.user.role === 'admin') {
            btnNewRDV.style.display = 'inline-flex';
            btnNewRDV.addEventListener('click', () => {
                this.modal.style.display = 'flex';
                this.modal.classList.add('active');
            });
        }
        // Bouton reste caché pour médecin (display: none dans le HTML)
        document.getElementById('btnCloseModal').addEventListener('click', () => {
            this.modal.style.display = 'none';
            this.modal.classList.remove('active');
        });

        // Formulaire


        // Filter: Recherche
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                // Si l'utilisateur tape une recherche, on efface le filtre date pour chercher globalement
                if (searchInput.value.trim() !== '') {
                    document.getElementById('dateFilter').value = '';
                }
                this.filterAppointments();
            });
        }

        // Filter: Date
        const dateFilter = document.getElementById('dateFilter');
        if (dateFilter) {
            dateFilter.addEventListener('change', () => this.filterAppointments());
        }

        // Form Submit
        document.getElementById('rdvForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSave();
        });
    }

    filterAppointments() {
        const query = document.getElementById('searchInput').value.toLowerCase();
        const dateValue = document.getElementById('dateFilter').value;

        const filtered = this.appointments.filter(rdv => {
            // Filtrer par nom patient (si champ de recherche rempli)
            const matchName = !query || (rdv.patient_nom && rdv.patient_nom.toLowerCase().includes(query));

            // Filtrer par date (si date sélectionnée)
            let matchDate = true;
            if (dateValue) {
                // rdv.date_rendez_vous est format 'YYYY-MM-DD HH:MM:SS'
                const rdvDate = rdv.date_rendez_vous.split(' ')[0];
                matchDate = (rdvDate === dateValue);
            }

            return matchName && matchDate;
        });

        this.renderTable(filtered);
    }

    async handleSave() {
        const formData = new FormData(document.getElementById('rdvForm'));
        const date = formData.get('date');
        const heure = formData.get('heure');

        // Combinaison Date + Heure pour MySQL (YYYY-MM-DD HH:MM:SS)
        const date_heure = `${date} ${heure}:00`;

        const data = {
            patient_id: formData.get('patient_id'),
            medecin_id: formData.get('medecin_id'),
            date_rendez_vous: date_heure,
            type_consultation: formData.get('type_consultation'),
            prix: formData.get('prix'),
            mode_paiement: formData.get('mode_paiement'),
            statut: formData.get('statut'),
            motif: formData.get('motif')
        };

        try {
            const response = await api.request('entity=rendez_vous&action=post', {
                method: 'POST',
                body: data  // api.request() gère la sérialisation JSON
            });

            if (response.success) {
                this.showAlert("Rendez-vous planifié avec succès", "success");
                this.modal.classList.remove('active');
                document.getElementById('rdvForm').reset();
                this.loadAppointments();
            }
        } catch (error) {
            this.showAlert(error.message, 'error');
        }
    }



    showAlert(message, type = 'error') {
        const el = document.getElementById('alertMessage');
        el.className = `alert alert-${type}`;
        el.innerHTML = message;
        el.classList.remove('hidden');
        setTimeout(() => el.classList.add('hidden'), 5000);
    }
}
