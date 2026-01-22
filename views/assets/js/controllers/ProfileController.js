/**
 * ProfileController
 * Gère la consultation, modification du profil et l'upload de photo
 */

class ProfileController {
    constructor() {
        this.user = null;
        this.profileForm = null;
        this.photoUploadInput = null;
    }

    async init() {
        this.user = api.getCurrentUser();
        if (!this.user) {
            window.location.href = '../index.html';
            return;
        }

        this.profileForm = document.getElementById('profileForm');

        this.renderMenu();
        this.updateHeader();
        await this.loadProfileData();



        // Récupérer l'input photo APRÈS le chargement des données (car le DOM peut avoir changé)
        this.photoUploadInput = document.getElementById('photoUpload');

        this.attachEvents();
    }

    updateHeader() {
        const name = this.user.prenom && this.user.nom ? `${this.user.prenom} ${this.user.nom}` : this.user.email;

        const nameEl = document.getElementById('headerUserName');
        if (nameEl) nameEl.textContent = name;

        const roleEl = document.getElementById('headerUserRole');
        if (roleEl) roleEl.textContent = this.user.role;

        const avatar = document.getElementById('headerAvatar');
        if (!avatar) return;

        if (this.user.photo) {
            const photoPath = '../../' + this.user.photo;
            avatar.innerHTML = `<img src="${photoPath}" class="user-avatar" alt="Avatar">`;
        } else {
            avatar.innerHTML = '';
            avatar.textContent = name.charAt(0).toUpperCase();
        }
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

        // 6. Mon Profil (actif sur cette page)
        html += `
            <a href="profile.html" class="menu-item active">
                <i class="fas fa-user-circle"></i>
                <span>Mon Profil</span>
            </a>
        `;

        menuContainer.innerHTML = html;
    }

    async loadProfileData() {
        try {
            const response = await api.getProfile(this.user.id);
            if (response.success) {
                const data = response.data;

                // Remplir les colonnes de gauche (résumé)
                const fullName = (data.medecin?.prenom ? `${data.medecin.prenom} ${data.medecin.nom}` :
                    (data.patient?.prenom ? `${data.patient.prenom} ${data.patient.nom}` : data.email));

                const fullNameEl = document.getElementById('fullName');
                if (fullNameEl) fullNameEl.textContent = fullName;

                const roleBadge = document.getElementById('roleBadge');
                if (roleBadge) roleBadge.textContent = data.role;

                const displayEmail = document.getElementById('displayEmail');
                if (displayEmail) displayEmail.textContent = data.email;

                const memberSince = document.getElementById('memberSince');
                if (memberSince) memberSince.textContent = new Date(data.date_creation).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });

                // Photo
                if (data.photo) {
                    const photoUrl = '../../' + data.photo + '?t=' + new Date().getTime();
                    const avatarEl = document.getElementById('profileAvatar');
                    if (avatarEl) {
                        avatarEl.innerHTML = `<img src="${photoUrl}" alt="Photo"><label for="photoUpload" class="avatar-upload-btn" title="Changer la photo"><i class="fas fa-camera"></i></label><input type="file" id="photoUpload" hidden accept="image/*">`;

                        const newInput = document.getElementById('photoUpload');
                        if (newInput) {
                            newInput.addEventListener('change', (e) => this.handlePhotoUpload(e));
                        }
                    }
                    this.user.photo = data.photo;
                    api.saveUserToStorage(this.user);
                    this.updateHeader();
                } else {
                    const nameChar = (data.medecin?.prenom || data.patient?.prenom || data.email.charAt(0)).charAt(0).toUpperCase();
                    const avatarInitial = document.getElementById('avatarInitial');
                    if (avatarInitial) avatarInitial.textContent = nameChar;
                }

                // Remplir le formulaire
                const profileData = data.medecin || data.patient || {};
                const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };

                setVal('nom', profileData.nom);
                setVal('prenom', profileData.prenom);
                setVal('email', data.email);
                setVal('telephone', profileData.telephone);

                // Champs spécifiques
                this.renderSpecificFields(data.role, profileData);
            }
        } catch (error) {
            console.error(error);
            this.showAlert(error.message, 'error');
        }
    }

    renderSpecificFields(role, data) {
        const container = document.getElementById('specificFields');
        if (!container) return; // Prevent crash if element missing

        container.innerHTML = '';

        if (role === 'medecin') {
            container.innerHTML = `
                <div class="form-group" style="grid-column: 1 / -1;">
                    <label class="form-label">Spécialité</label>
                    <input type="text" id="specialite" name="specialite" class="form-input" value="${data.specialite || ''}">
                </div>
            `;
        } else if (role === 'patient') {
            container.innerHTML = `
                <div class="form-group">
                    <label class="form-label">Date de naissance</label>
                    <input type="date" id="date_naissance" name="date_naissance" class="form-input" value="${data.date_naissance || ''}">
                </div>
                <div class="form-group">
                    <label class="form-label">Groupe Sanguin</label>
                    <select id="groupe_sanguin" name="groupe_sanguin" class="form-input">
                        ${['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(g =>
                `<option value="${g}" ${data.groupe_sanguin === g ? 'selected' : ''}>${g}</option>`
            ).join('')}
                    </select>
                </div>
                <div class="form-group" style="grid-column: 1 / -1;">
                    <label class="form-label">Adresse</label>
                    <textarea id="adresse" name="adresse" class="form-input" rows="2">${data.adresse || ''}</textarea>
                </div>
            `;
        }
    }

    attachEvents() {
        const btnLogout = document.getElementById('btnLogout');
        if (btnLogout) btnLogout.addEventListener('click', () => api.logout());

        if (this.profileForm) {
            this.profileForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleProfileUpdate();
            });
        }

        if (this.photoUploadInput) {
            this.photoUploadInput.addEventListener('change', async (e) => {
                if (e.target.files.length > 0) {
                    await this.handlePhotoUpload(e.target.files[0]);
                }
            });
        }

        const pwForm = document.getElementById('passwordForm');
        if (pwForm) {
            pwForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handlePasswordUpdate();
            });
        }
    }

    async handleProfileUpdate() {
        if (!this.profileForm) return;
        const formData = new FormData(this.profileForm);
        const data = Object.fromEntries(formData.entries());

        try {
            this.setLoading('btnSave', true);
            const response = await api.updateProfile(this.user.id, data);
            if (response.success) {
                this.showAlert('Profil mis à jour avec succès', 'success');
                await this.init();
            }
        } catch (error) {
            this.showAlert(error.message, 'error');
        } finally {
            this.setLoading('btnSave', false);
        }
    }

    async handlePhotoUpload(fileOrEvent) {
        // Gérer le cas où on reçoit un Event ou un File directement
        let file;
        if (fileOrEvent instanceof Event) {
            file = fileOrEvent.target.files[0];
        } else if (fileOrEvent instanceof File) {
            file = fileOrEvent;
        } else {
            console.error('handlePhotoUpload: paramètre invalide');
            return;
        }

        if (!file) return;

        try {
            this.showAlert('Chargement de la photo...', 'success');
            const response = await api.uploadPhoto(this.user.id, file);
            if (response.success) {
                this.showAlert('Photo mise à jour !', 'success');
                await this.loadProfileData();
                this.updateHeader();
            }
        } catch (error) {
            this.showAlert(error.message, 'error');
        }
    }

    async handlePasswordUpdate() {
        const newPw = document.getElementById('newPassword');
        const confirmPw = document.getElementById('confirmPassword');

        if (!newPw || !confirmPw) return;

        const newPassword = newPw.value;
        const confirm = confirmPw.value;

        if (newPassword !== confirm) {
            this.showAlert('Les mots de passe ne correspondent pas', 'error');
            return;
        }

        if (newPassword.length < 6) {
            this.showAlert('Le mot de passe doit faire au moins 6 caractères', 'error');
            return;
        }

        try {
            const response = await api.updateProfile(this.user.id, { mot_de_passe: newPassword });
            if (response.success) {
                this.showAlert('Mot de passe mis à jour !', 'success');
                document.getElementById('passwordForm').reset();
            }
        } catch (error) {
            this.showAlert(error.message, 'error');
        }
    }

    showAlert(message, type = 'error') {
        const el = document.getElementById('alertMessage');
        if (!el) {
            console.warn('Alert element missing:', message);
            return;
        }
        el.className = `alert alert-${type}`;
        el.innerHTML = `<i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'check-circle'}"></i> <span>${message}</span>`;
        el.classList.remove('hidden');
        setTimeout(() => el.classList.add('hidden'), 5000);
    }

    setLoading(id, isLoading) {
        const btn = document.getElementById(id);
        if (!btn) return;

        if (isLoading) {
            btn.disabled = true;
            btn.classList.add('loading');
        } else {
            btn.disabled = false;
            btn.classList.remove('loading');
        }
    }
}
