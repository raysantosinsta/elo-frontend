import { api } from "./api";

export interface NotificationSettings {
  notificationDays: number;
}

export const companyService = {
  async getNotificationSettings(companyId: string): Promise<NotificationSettings> {
    // 🔥 CORREÇÃO: usar /companies/ (plural) e GET
    const { data } = await api.get(`/companies/${companyId}/notification-settings`);
    return data;
  },

  async updateNotificationSettings(
    companyId: string,
    settings: NotificationSettings
  ): Promise<NotificationSettings> {
    // 🔥 CORREÇÃO: 
    // 1. Usar /companies/ (plural)
    // 2. Usar PATCH (não PUT)
    // 3. O endpoint correto é /companies/:id/notification-settings
    const { data } = await api.patch(
      `/companies/${companyId}/notification-settings`,
      settings
    );
    return data;
  },
};