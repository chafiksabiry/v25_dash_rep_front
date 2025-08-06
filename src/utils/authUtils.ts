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
    console.log('AgentId trouvé dans les cookies:', agentIdFromCookie);
    return agentIdFromCookie.trim();
  }

  // 2. Si pas trouvé dans les cookies, essayer localStorage
  try {
    const profileDataString = localStorage.getItem('profileData');
    if (profileDataString) {
      const profileData = JSON.parse(profileDataString);
      const agentIdFromProfile = profileData._id;
      
      if (agentIdFromProfile) {
        console.log('AgentId trouvé dans profileData:', agentIdFromProfile);
        return agentIdFromProfile;
      }
    }
  } catch (error) {
    console.error('Erreur lors de la lecture de profileData depuis localStorage:', error);
  }

  console.warn('AgentId non trouvé dans les cookies ni dans localStorage');
  return null;
};

/**
 * Récupère le token d'authentification depuis localStorage
 * @returns {string | null} Le token ou null si non trouvé
 */
export const getAuthToken = (): string | null => {
  const token = localStorage.getItem('token');
  if (!token) {
    console.warn('Token d\'authentification non trouvé dans localStorage');
  }
  return token;
};

/**
 * Vérifie si l'utilisateur est authentifié
 * @returns {boolean} True si l'utilisateur est authentifié
 */
export const isAuthenticated = (): boolean => {
  const agentId = getAgentId();
  const token = getAuthToken();
  return !!(agentId && token);
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