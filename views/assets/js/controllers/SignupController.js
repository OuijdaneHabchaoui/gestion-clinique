/**
 * Contrôleur d'inscription
 */
class SignupController {
    constructor() {
        console.log("SignupController: Initialisation...");
        this.form = document.getElementById('signupForm');
        this.errorDiv = document.getElementById('signupError');
        this.submitBtn = this.form.querySelector('button[type="submit"]');

        if (!this.form) {
            console.error("ERREUR FATALE: Formulaire #signupForm introuvable !");
            return;
        }

        this.init();
    }

    init() {
        // Rediriger si déjà connecté
        if (api.isAuthenticated()) {
            console.log("Utilisateur déjà connecté, redirection accueil");
            window.location.href = '../index.html';
            return;
        }

        // Attacher l'événement Submit
        this.form.addEventListener('submit', (e) => {
            console.log("Evenement Submit détecté !");
            this.handleSubmit(e);
        });

        console.log("SignupController: Prêt et écoute l'événement submit.");
    }

    async handleSubmit(e) {
        e.preventDefault(); // Empêcher le rechargement de la page
        console.log("Traitement du formulaire...");

        this.errorDiv.classList.add('hidden');
        this.errorDiv.textContent = '';

        // Récupération des données
        const formData = new FormData(this.form);
        const data = Object.fromEntries(formData.entries());

        console.log("Données récupérées:", data);

        // Validation - Mots de passe
        if (data.password !== data.confirmPassword) {
            this.showError("Les mots de passe ne correspondent pas");
            return;
        }

        if (data.password.length < 6) {
            this.showError("Le mot de passe doit contenir au moins 6 caractères");
            return;
        }

        // Validation - Date de naissance (Au cas où HTML5 ne marche pas)
        if (!data.date_naissance) {
            this.showError("La date de naissance est obligatoire");
            return;
        }

        // Préparation Payload avec tous les champs
        const payload = {
            nom: data.nom,
            prenom: data.prenom,
            email: data.email,
            telephone: data.telephone || null,
            date_naissance: data.date_naissance,
            groupe_sanguin: data.groupe_sanguin || null,
            adresse: data.adresse || null,
            mot_de_passe: data.password
        };

        this.setLoading(true);

        try {
            console.log("Envoi à l'API via api.register...", payload);

            // Vérifier si api.register existe (problème de cache potentiel)
            if (typeof api.register !== 'function') {
                throw new Error("Erreur Interne : La fonction api.register n'est pas chargée. Videz le cache du navigateur.");
            }

            const response = await api.register(payload);
            console.log("Réponse API:", response);

            if (response.success) {
                // Afficher un message de succès élégant
                this.showSuccess("🎉 Inscription réussie ! Redirection en cours...");

                // Redirection après 2 secondes
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 2000);
            } else {
                this.showError(response.message || "Erreur inconnue lors de l'inscription");
            }

        } catch (error) {
            console.error("Erreur Catch:", error);
            this.showError(error.message || "Une erreur est survenue lors de la communication avec le serveur.");
        } finally {
            this.setLoading(false);
        }
    }

    showSuccess(msg) {
        this.errorDiv.innerHTML = `<i class="fas fa-check-circle"></i> ${msg}`;
        this.errorDiv.classList.remove('hidden');
        this.errorDiv.style.display = 'flex';
        this.errorDiv.style.alignItems = 'center';
        this.errorDiv.style.gap = '10px';
        this.errorDiv.style.background = 'rgba(16, 185, 129, 0.15)';
        this.errorDiv.style.border = '1px solid rgba(16, 185, 129, 0.3)';
        this.errorDiv.style.color = '#10b981';
        this.errorDiv.style.padding = '16px 20px';
        this.errorDiv.style.borderRadius = '12px';
        this.errorDiv.style.marginBottom = '20px';
        this.errorDiv.style.fontSize = '1rem';
        this.errorDiv.style.fontWeight = '500';
    }

    showError(msg) {
        console.warn("Affichage erreur:", msg);
        this.errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${msg}`;
        this.errorDiv.classList.remove('hidden');
        this.errorDiv.style.display = 'flex';
        this.errorDiv.style.alignItems = 'center';
        this.errorDiv.style.gap = '10px';
        this.errorDiv.style.background = 'rgba(239, 68, 68, 0.15)';
        this.errorDiv.style.border = '1px solid rgba(239, 68, 68, 0.3)';
        this.errorDiv.style.color = '#fca5a5';
        this.errorDiv.style.padding = '16px 20px';
        this.errorDiv.style.borderRadius = '12px';
        this.errorDiv.style.marginBottom = '20px';
        this.errorDiv.style.fontSize = '0.95rem';
    }

    setLoading(loading) {
        if (loading) {
            this.submitBtn.disabled = true;
            this.submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Traitement...';
        } else {
            this.submitBtn.disabled = false;
            this.submitBtn.innerHTML = '<span>Créer mon compte</span> <i class="fas fa-arrow-right"></i>';
        }
    }
}

