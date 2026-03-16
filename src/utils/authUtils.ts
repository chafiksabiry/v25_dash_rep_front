// Utilitaires pour la gestion de l'authentification et des données utilisateur

import Cookies from 'js-cookie';

/**
 * Récupère l'agentId de l'utilisateur connecté
 * Essaie d'abord les cookies, puis le localStorage (profileData._id)
 * @returns {string | null} L'agentId de l'utilisateur ou null si non trouvé
 */
export const getAgentId = (): string | null => {
  // 1. Essayer d'abord les cookies
  const agentIdFromCookie = Cookies.get('agentId');
  if (agentIdFromCookie) {
    return agentIdFromCookie.trim();
  }

  // 2. Essayer localStorage (directement ou dans profileData)
  const agentIdFromLocal = localStorage.getItem('agentId') || localStorage.getItem('userId');
  if (agentIdFromLocal) {
    return agentIdFromLocal.trim();
  }

  const profileData = getProfileData();
  if (profileData && profileData._id) {
    return profileData._id.trim();
  }

  // 3. Essayer sessionStorage
  const agentIdFromSession = sessionStorage.getItem('agentId') || sessionStorage.getItem('userId');
  if (agentIdFromSession) {
    return agentIdFromSession.trim();
  }

  return null;
};

/**
 * Récupère le token d'authentification depuis localStorage
 * @returns {string | null} Le token ou null si non trouvé
 */
export const getAuthToken = (): string | null => {
  return localStorage.getItem('token') || sessionStorage.getItem('token');
};

/**
 * Vérifie si l'utilisateur est authentifié
 * @returns {boolean} True si l'utilisateur est authentifié
 */
export const isAuthenticated = (): boolean => {
  const agentId = getAgentId();
  return !!agentId;
};

/**
 * Récupère les données complètes du profil utilisateur depuis localStorage
 * @returns {any | null} Les données du profil ou null si non trouvées
 */
export const getProfileData = (): any | null => {
  try {
    const profileDataString = localStorage.getItem('profileData');
    if (profileDataString) {
      return JSON.parse(profileDataString);
    }
  } catch (error) {
    console.error('Erreur lors de la lecture de profileData:', error);
  }
  return null;
};

/**
 * Récupère les informations utilisateur de base
 * @returns {object | null} Informations de base de l'utilisateur
 */
export const getUserInfo = () => {
  const profileData = getProfileData();
  if (!profileData) return null;

  return {
    id: profileData._id,
    name: profileData.personalInfo?.name || 'Utilisateur',
    email: profileData.personalInfo?.email || '',
    currentRole: profileData.professionalSummary?.currentRole || 'HARX Rep',
    photo: profileData.personalInfo?.photo?.url || null
  };
};