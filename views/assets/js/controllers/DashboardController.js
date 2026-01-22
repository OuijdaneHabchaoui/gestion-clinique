/**
 * DashboardController
 * Gère l'affichage dynamique du tableau de bord selon l'utilisateur
 */

class DashboardController {
    constructor() {
        this.user = null;
    }

    async init() {
        // 1. Vérifier l'authentification
        this.user = api.getCurrentUser();
        if (!this.user) {
            window.location.href = '../index.html';
            return;
        }

        // 2. Mettre à jour les infos d'en-tête
        this.updateHeader();

        // 3. Charger le menu selon le rôle
        this.renderMenu();

        // Si patient, rediriger "Voir tout" vers mes-rendez-vous
        if (this.user.role === 'patient') {
            const linkViewAll = document.getElementById('linkViewAll');
            if (linkViewAll) linkViewAll.href = 'mes-rendez-vous.html';
        }

        // 4. Charger les statistiques et données
        await this.loadDashboardData();

        // 5. Attacher les événements (logout, etc.)
        this.attachEvents();
    }

    updateHeader() {
        const name = this.user.prenom && this.user.nom ?
            `${this.user.prenom} ${this.user.nom}` :
            this.user.email.split('@')[0];

        document.getElementById('headerUserName').textContent = name;
        document.getElementById('headerUserRole').textContent = this.user.role;
        document.getElementById('welcomeName').textContent = this.user.prenom || name;

        // Initiale pour l'avatar
        const avatar = document.getElementById('headerAvatar');
        avatar.textContent = name.charAt(0).toUpperCase();

        // Si l'utilisateur a une photo (à implémenter plus tard)
        if (this.user.photo) {
            avatar.innerHTML = `<img src="../../${this.user.photo}" class="user-avatar" alt="Avatar">`;
        }
    }

    renderMenu() {
        const menuContainer = document.getElementById('sidebarMenu');
        if (!menuContainer) return;

        let html = '';
        const role = this.user.role;

        // 1. Dashboard (Commun à tous)
        html += `
            <a href="dashboard.html" class="menu-item active">
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

        // 3. Rendez-vous (Admin + Médecin)
        if (role === 'admin' || role === 'medecin') {
            html += `
                <a href="rendez-vous.html" class="menu-item">
                    <i class="fas fa-calendar-alt"></i>
                    <span>Rendez-vous</span>
                </a>
            `;
        }

        // 4. Patient: Mes Rendez-vous
        if (role === 'patient') {
            html += `
                <a href="mes-rendez-vous.html" class="menu-item">
                    <i class="fas fa-calendar-check"></i>
                    <span>Mes Rendez-vous</span>
                </a>
            `;
        }

        // 5. Utilisateurs (Admin only)
        if (role === 'admin') {
            html += `
                <a href="utilisateurs.html" class="menu-item">
                    <i class="fas fa-user-shield"></i>
                    <span>Utilisateurs</span>
                </a>
            `;
        }

        // 6. Mon Profil (Commun à tous)
        html += `
            <a href="profile.html" class="menu-item">
                <i class="fas fa-user-circle"></i>
                <span>Mon Profil</span>
            </a>
        `;

        menuContainer.innerHTML = html;
    }

    async loadDashboardData() {
        try {
            // Chargement résilient des données
            let patients = [], medecins = [], appointments = [];

            try {
                const res = await api.request('entity=patients&action=get');
                patients = res.success ? res.data : [];
            } catch (e) { console.warn('Erreur chargement patients', e); }

            try {
                const res = await api.request('entity=medecins&action=get');
                medecins = res.success ? res.data : [];
            } catch (e) { console.warn('Erreur chargement médecins', e); }

            try {
                const res = await api.request('entity=rendez_vous&action=get');
                appointments = res.success ? res.data : [];
            } catch (e) { console.warn('Erreur chargement RDV', e); }

            this.renderStats(patients, medecins, appointments);
            this.renderRecentAppointments(appointments);

        } catch (error) {
            console.error("Erreur critique dashboard:", error);
        }
    }

    renderStats(patients, medecins, appointments) {
        const statsGrid = document.getElementById('statsGrid');
        let stats = [];

        // Calculs communs
        const today = new Date().toISOString().split('T')[0];
        const rdvToday = appointments.filter(a => a.date_rendez_vous && a.date_rendez_vous.startsWith(today) && a.statut !== 'annule').length;

        if (this.user.role === 'admin') {
            stats = [
                { label: 'Total Patients', value: patients.length, icon: 'fas fa-users', color: '#0ea5e9' },
                { label: 'RDV Aujourd\'hui', value: rdvToday, icon: 'fas fa-calendar-day', color: '#10b981' },
                { label: 'Médecins Actifs', value: medecins.length, icon: 'fas fa-user-md', color: '#8b5cf6' }
            ];
        } else if (this.user.role === 'medecin') {
            // Stats Médecin
            const medecinId = this.user.profile_id || (this.user.medecin_infos ? this.user.medecin_infos.id : null);

            // Filtrer les RDV du médecin uniquement (et exclure les annulés)
            const myAppointments = medecinId ? appointments.filter(a => a.medecin_id == medecinId && a.statut !== 'annule') : [];

            // Calculer RDV aujourd'hui pour ce médecin
            const myRdvToday = myAppointments.filter(a => a.date_rendez_vous && a.date_rendez_vous.startsWith(today)).length;

            // Calculer Mes Patients (patients uniques vus par ce médecin)
            const myPatientIds = new Set(myAppointments.map(a => a.patient_id));
            const myPatientsCount = myPatientIds.size;

            stats = [
                { label: 'Mes Patients', value: myPatientsCount, icon: 'fas fa-user-injured', color: '#0ea5e9' },
                { label: 'RDV Aujourd\'hui', value: myRdvToday, icon: 'fas fa-clock', color: '#10b981' },
                { label: 'Consultations', value: myAppointments.length, icon: 'fas fa-check-circle', color: '#f59e0b' }
            ];
        } else {
            // Patient
            const patientId = this.user.profile_id || (this.user.patient_infos ? this.user.patient_infos.id : null);
            const myRdv = patientId ? appointments.filter(a => a.patient_id == patientId).length : 0;
            const myRdvPending = patientId ? appointments.filter(a => a.patient_id == patientId && a.statut === 'en_attente').length : 0;

            stats = [
                { label: 'Mes RDV', value: myRdv, icon: 'fas fa-calendar-check', color: '#0ea5e9' },
                { label: 'En Attente', value: myRdvPending, icon: 'fas fa-clock', color: '#f59e0b' }
            ];
        }

        statsGrid.innerHTML = stats.map(stat => `
            <div class="stat-card">
                <div class="stat-icon" style="background: ${stat.color}15; color: ${stat.color}">
                    <i class="${stat.icon}"></i>
                </div>
                <div class="stat-details">
                    <h4>${stat.label}</h4>
                    <p class="stat-value">${stat.value}</p>
                </div>
            </div>
        `).join('');
    }

    renderRecentAppointments(appointments) {
        const body = document.getElementById('recentAppointmentsBody');

        // Filtrer selon le rôle
        let filteredAppointments = appointments;

        if (this.user.role === 'patient') {
            // Patient : uniquement ses propres RDV
            const patientId = this.user.profile_id || (this.user.patient_infos ? this.user.patient_infos.id : null);
            filteredAppointments = patientId ? appointments.filter(a => a.patient_id == patientId) : [];
        } else if (this.user.role === 'medecin') {
            // Médecin : uniquement ses RDV
            const medecinId = this.user.profile_id || (this.user.medecin_infos ? this.user.medecin_infos.id : null);
            filteredAppointments = medecinId ? appointments.filter(a => a.medecin_id == medecinId) : appointments;
        }
        // Admin et réceptionniste voient tout

        // Tri et limite à 5
        const recent = filteredAppointments
            .sort((a, b) => new Date(b.date_rendez_vous) - new Date(a.date_rendez_vous))
            .slice(0, 5);

        if (recent.length === 0) {
            body.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Aucun rendez-vous récent</td></tr>';
            return;
        }

        body.innerHTML = recent.map(app => `
            <tr>
                <td><strong>${app.patient_nom || 'Inconnu'}</strong></td>
                <td>${new Date(app.date_rendez_vous).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                <td>${app.medecin_nom ? 'Dr. ' + app.medecin_nom : 'Généraliste'}</td>
                <td><span class="status-badge status-${app.statut}">${app.statut}</span></td>
                <td>${app.motif || 'Consultation'}</td>
            </tr>
        `).join('');
    }



    attachEvents() {
        document.getElementById('btnLogout').addEventListener('click', (e) => {
            e.preventDefault();
            api.logout();
        });
    }
}
