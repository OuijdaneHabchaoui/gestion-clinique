/**
 * Contrôleur d'authentification
 * Gère la logique de connexion/déconnexion
 */

class AuthController {
    constructor() {
        this.form = null;
        this.emailInput = null;
        this.passwordInput = null;
        this.loginBtn = null;
        this.alertMessage = null;
        this.togglePasswordBtn = null;
    }

    /**
     * Initialisation du contrôleur
     */
    init() {
        // Vérifier si l'utilisateur est déjà connecté
        if (api.isAuthenticated()) {
            this.redirectToDashboard();
            return;
        }

        // Récupérer les éléments du DOM
        this.form = document.getElementById('loginForm');
        this.emailInput = document.getElementById('email');
        this.passwordInput = document.getElementById('password');
        // Tentative de récupération par ID, sinon par sélecteur CSS
        this.loginBtn = document.getElementById('loginBtn') || this.form.querySelector('button[type="submit"]');
        // Elements optionnels
        this.alertMessage = document.getElementById('alertMessage') || document.getElementById('loginError');
        this.togglePasswordBtn = document.getElementById('togglePassword');

        console.log("AuthController: Elements chargés. loginBtn present ?", !!this.loginBtn);

        // Attacher les événements
        this.attachEvents();

        // Pré-remplir si "se souvenir de moi" était coché
        this.loadRememberedEmail();
    }

    /**
     * Attacher les événements aux éléments
     */
    attachEvents() {
        // Soumission du formulaire
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Toggle affichage du mot de passe (si le bouton existe)
        if (this.togglePasswordBtn) {
            this.togglePasswordBtn.addEventListener('click', () => {
                this.togglePasswordVisibility();
            });
        }

        // Validation en temps réel
        this.emailInput.addEventListener('input', () => {
            this.validateEmail();
        });

        this.passwordInput.addEventListener('input', () => {
            this.validatePassword();
        });
    }

    /**
     * Gérer la connexion
     */
    async handleLogin() {
        // Récupérer les valeurs
        const email = this.emailInput.value.trim();
        const password = this.passwordInput.value;
        const rememberCheckbox = document.getElementById('remember');
        const remember = rememberCheckbox ? rememberCheckbox.checked : false;

        // Validation
        if (!this.validateForm(email, password)) {
            return;
        }

        // Désactiver le bouton et afficher le loading
        this.setLoading(true);
        this.hideAlert();

        try {
            // Appel API
            const response = await api.login(email, password);

            if (response.success) {
                // Sauvegarder l'email si "se souvenir de moi"
                if (remember) {
                    localStorage.setItem('remembered_email', email);
                } else {
                    localStorage.removeItem('remembered_email');
                }

                // Afficher un message de succès
                this.showAlert('Connexion en cours ...', 'success');

                // Rediriger vers le dashboard après 1 seconde
                setTimeout(() => {
                    this.redirectToDashboard();
                }, 1000);
            }
        } catch (error) {
            // Afficher l'erreur
            this.showAlert(error.message || 'Email ou mot de passe incorrect', 'error');
            this.setLoading(false);
        }
    }

    /**
     * Valider le formulaire
     */
    validateForm(email, password) {
        if (!email) {
            this.showAlert('Veuillez entrer votre adresse email', 'error');
            this.emailInput.focus();
            return false;
        }

        if (!this.isValidEmail(email)) {
            this.showAlert('Veuillez entrer une adresse email valide', 'error');
            this.emailInput.focus();
            return false;
        }

        if (!password) {
            this.showAlert('Veuillez entrer votre mot de passe', 'error');
            this.passwordInput.focus();
            return false;
        }

        if (password.length < 6) {
            this.showAlert('Le mot de passe doit contenir au moins 6 caractères', 'error');
            this.passwordInput.focus();
            return false;
        }

        return true;
    }

    /**
     * Valider l'email en temps réel
     */
    validateEmail() {
        const email = this.emailInput.value.trim();
        if (email && !this.isValidEmail(email)) {
            this.emailInput.style.borderColor = 'var(--error-color)';
        } else {
            this.emailInput.style.borderColor = '';
        }
    }

    /**
     * Valider le mot de passe en temps réel
     */
    validatePassword() {
        const password = this.passwordInput.value;
        if (password && password.length < 6) {
            this.passwordInput.style.borderColor = 'var(--error-color)';
        } else {
            this.passwordInput.style.borderColor = '';
        }
    }

    /**
     * Vérifier si l'email est valide
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Toggle visibilité du mot de passe
     */
    togglePasswordVisibility() {
        const type = this.passwordInput.type === 'password' ? 'text' : 'password';
        this.passwordInput.type = type;

        // Changer l'icône
        const icon = this.togglePasswordBtn.querySelector('i');
        if (type === 'text') {
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    }

    /**
     * Afficher un message d'alerte
     */
    showAlert(message, type = 'error') {
        this.alertMessage.className = `alert alert-${type}`;
        this.alertMessage.innerHTML = `
            <i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'check-circle'}"></i>
            <span>${message}</span>
        `;
        this.alertMessage.classList.remove('hidden');

        // Animation d'entrée
        this.alertMessage.style.animation = 'fadeIn 0.3s ease-out';
    }

    /**
     * Masquer le message d'alerte
     */
    hideAlert() {
        this.alertMessage.classList.add('hidden');
    }

    /**
     * Activer/désactiver l'état de chargement
     */
    setLoading(isLoading) {
        if (isLoading) {
            this.loginBtn.disabled = true;
            this.loginBtn.classList.add('loading');
            this.emailInput.disabled = true;
            this.passwordInput.disabled = true;
        } else {
            this.loginBtn.disabled = false;
            this.loginBtn.classList.remove('loading');
            this.emailInput.disabled = false;
            this.passwordInput.disabled = false;
        }
    }

    /**
     * Charger l'email sauvegardé
     */
    loadRememberedEmail() {
        const rememberedEmail = localStorage.getItem('remembered_email');
        if (rememberedEmail) {
            this.emailInput.value = rememberedEmail;
            const rememberCheckbox = document.getElementById('remember');
            if (rememberCheckbox) {
                rememberCheckbox.checked = true;
            }
        }
    }

    /**
     * Rediriger vers la page d'accueil
     */
    redirectToDashboard() {
        const user = api.getCurrentUser();

        if (!user) {
            window.location.href = 'login.html';
            return;
        }

        // Redirection vers le dashboard
        window.location.href = 'dashboard.html';
    }
}
