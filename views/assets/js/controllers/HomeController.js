/**
 * HomeController
 * Gère la page d'accueil et l'état du header (connecté/non-connecté)
 */

class HomeController {
    constructor() {
        this.header = null;
        this.authContainer = null;
    }

    init() {
        this.header = document.getElementById('mainHeader');
        this.authContainer = document.getElementById('headerAuthContainer');

        // Gérer le scroll du header
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                this.header.classList.add('scrolled');
            } else {
                this.header.classList.remove('scrolled');
            }
        });

        // Mettre à jour l'affichage selon le login
        this.updateAuthUI();
    }

    updateAuthUI() {
        const user = api.getCurrentUser();
        // Détecter si on est dans un sous-dossier (ex: /pages/)
        const isInPagesDir = window.location.pathname.includes('/pages/');
        const basePath = isInPagesDir ? '' : 'pages/';
        const assetsPath = isInPagesDir ? '../' : '';

        // Gérer le bouton Hero CTA (Prendre RDV) s'il existe
        const heroCtaBtn = document.getElementById('heroCtaBtn');
        if (heroCtaBtn) {
            if (user) {
                if (user.role === 'patient') {
                    heroCtaBtn.href = basePath + 'mes-rendez-vous.html';
                } else if (user.role === 'medecin' || user.role === 'admin') {
                    heroCtaBtn.href = basePath + 'rendez-vous.html';
                }
            } else {
                heroCtaBtn.href = basePath + 'login.html';
            }
        }

        if (user) {
            // Affichage mode "Coursera" - Menu déroulant
            const name = user.prenom || user.email.split('@')[0];
            const fullName = user.prenom && user.nom ? `${user.prenom} ${user.nom}` : user.email;
            const initial = name.charAt(0).toUpperCase();

            // Gestion de l'avatar
            let avatarHtml;
            // Si user.photo existe et ne commence pas par http
            if (user.photo && !user.photo.startsWith('http')) {
                // user.photo est relatif à la racine backend (ex: uploads/xxx.jpg)
                // Si on est dans index.html (views/), le chemin relatif vers backend/ est ../
                // Si on est dans pages/xxx.html (views/pages/), le chemin relatif vers backend/ est ../../
                const relativeToBackend = isInPagesDir ? '../../' : '../';
                const photoUrl = relativeToBackend + user.photo;
                avatarHtml = `<img src="${photoUrl}" class="user-avatar-circle" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">`;
            } else {
                avatarHtml = `
                    <div class="user-avatar-circle" style="width: 40px; height: 40px; background: #0ea5e9; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; color: white;">
                        ${initial}
                    </div>`;
            }

            this.authContainer.innerHTML = `
                <div class="user-menu-container">
                    <button class="user-btn" id="userMenuBtn">
                        ${avatarHtml}
                        <span class="nav-name" style="font-weight: 500; color: ${isInPagesDir ? '#333' : 'white'};">${name}</span>
                        <i class="fas fa-chevron-down" style="font-size: 0.7rem; color: ${isInPagesDir ? '#666' : 'rgba(255,255,255,0.7)'};"></i>
                    </button>
                    
                    <div class="dropdown-menu" id="userDropdown">
                        <div class="dropdown-header">
                            ${avatarHtml}
                            <div>
                                <div style="font-weight: 600; color: #0f172a;">${fullName}</div>
                                <div style="font-size: 0.85rem; color: #64748b;">${user.role}</div>
                            </div>
                        </div>
                        
                        <a href="${basePath}profile.html" class="dropdown-item">
                            <i class="fas fa-user" style="width: 20px;"></i> Mon Profil
                        </a>
                        <a href="${basePath}dashboard.html" class="dropdown-item">
                            <i class="fas fa-th-large" style="width: 20px;"></i> Tableau de bord
                        </a>
                        ${user.role === 'patient' ? `
                        <a href="${basePath}mes-rendez-vous.html" class="dropdown-item">
                            <i class="fas fa-calendar-check" style="width: 20px;"></i> Mes Rendez-vous
                        </a>` : ''}
                        
                        <div class="dropdown-divider"></div>
                        
                        <a href="#" class="dropdown-item" id="dropdownLogout" style="color: #ef4444;">
                            <i class="fas fa-sign-out-alt" style="width: 20px;"></i> Déconnexion
                        </a>
                    </div>
                </div>
            `;

            // Toggle dropdown
            const menuBtn = document.getElementById('userMenuBtn');
            const dropdown = document.getElementById('userDropdown');

            menuBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropdown.classList.toggle('active');
            });

            // Fermer si clic ailleurs
            document.addEventListener('click', () => {
                dropdown.classList.remove('active');
            });

            // Logout
            document.getElementById('dropdownLogout').addEventListener('click', (e) => {
                e.preventDefault();
                api.logout();
                // Rediriger vers l'accueil
                window.location.href = isInPagesDir ? '../index.html' : 'index.html';
            });

        } else {
            // Bouton de connexion classique
            this.authContainer.innerHTML = `
                <a href="${basePath}login.html" class="btn btn-primary btn-header-auth">Espace Patient / Médecin</a>
            `;
        }
    }
}
