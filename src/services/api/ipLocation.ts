export interface IpLocationResponse {
  success: boolean;
  locationInfo: {
    countryCode: string;
    [key: string]: any;
  };
  [key: string]: any;
}

class IpLocationApi {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_REP_API_URL || '';
  }

  async getUserLatestIpLocation(userId: string): Promise<IpLocationResponse> {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/ip/user/${userId}/latest`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching IP location:', error);
      throw error;
    }
  }
}

export const ipLocationApi = new IpLocationApi(); 