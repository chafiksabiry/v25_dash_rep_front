import axios from 'axios';

const api = {
  profile: {
    get: () => axios.get('/api/profile'),
    getById: (id: string) => axios.get(`/api/profile/user/${id}`),
    update: (id: string, data: any) => axios.put(`/api/profile/${id}`, data),
  }
};

export default api; 