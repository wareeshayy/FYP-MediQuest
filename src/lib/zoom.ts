import axios from 'axios';

interface ZoomMeetingOptions {
  topic: string;
  start_time?: string;
  duration?: number;
  password?: string;
  settings?: {
    join_before_host?: boolean;
    waiting_room?: boolean;
    email_notification?: boolean;
    participant_video?: boolean;
    registrants_confirmation_email?: boolean;
    registrants_email_notification?: boolean;
  };
}

interface ZoomMeetingResponse {
  id: string;
  join_url: string;
  start_url: string;
  topic: string;
  start_time: string;
  duration: number;
  password: string;
  created_at: string;
}

export class ZoomService {
  private clientId: string;
  private accountId: string;
  private clientSecret: string;
  private apiBaseUrl = "https://api.zoom.us/v2";
  private authTokenUrl = "https://zoom.us/oauth/token";

  constructor() {
    this.clientId = process.env.ZOOM_CLIENT_ID || "";
    this.accountId = process.env.ZOOM_ACCOUNT_ID || "";
    this.clientSecret = process.env.ZOOM_CLIENT_SECRET || "";
  }

  /**
   * Get access token from Zoom OAuth API
   */
  async getAccessToken(): Promise<string | undefined> {
    try {
      if (!this.clientId || !this.accountId || !this.clientSecret) {
        throw new Error("Zoom credentials are not configured. Please check your .env.local file.");
      }

      // Trim any whitespace from credentials
      const clientId = this.clientId.trim();
      const accountId = this.accountId.trim();
      const clientSecret = this.clientSecret.trim();

      // Create Basic Auth header
      const authString = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

      const authRequest = {
        method: 'POST',
        maxBodyLength: Infinity,
        url: `${this.authTokenUrl}?grant_type=account_credentials&account_id=${accountId}`,
        headers: {
          'Authorization': `Basic ${authString}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      };

      const response = await axios.request(authRequest);
      
      if (!response.data?.access_token) {
        throw new Error("No access token received from Zoom API");
      }
      
      return response.data.access_token;
    } catch (error: any) {
      const errorDetails = error.response?.data || error.message;
      console.error("Error getting Zoom access token:", {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      
      let errorMessage = "Failed to get Zoom access token";
      if (error.response?.status === 400) {
        errorMessage = "Invalid Zoom credentials. Please check your Client ID, Client Secret, and Account ID in .env.local";
      } else if (error.response?.status === 401) {
        errorMessage = "Zoom authentication failed. Please verify your credentials are correct.";
      } else if (error.response?.data?.error) {
        errorMessage = `Zoom API error: ${error.response.data.error}`;
      } else {
        errorMessage = `Failed to get Zoom access token: ${error.message}`;
      }
      
      throw new Error(errorMessage);
    }
  }

  /**
   * Create a Zoom meeting
   */
  async createMeeting(options: ZoomMeetingOptions): Promise<ZoomMeetingResponse> {
    try {
      const token = await this.getAccessToken();
      if (!token) {
        throw new Error("Failed to obtain access token");
      }

      // Generate a random password if not provided
      const password = options.password || this.generateRandomPassword();

      const meetingData = {
        topic: options.topic,
        type: 2, // Scheduled meeting
        start_time: options.start_time || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Default: tomorrow
        duration: options.duration || 60, // Default: 60 minutes
        password: password,
        settings: {
          join_before_host: options.settings?.join_before_host ?? true,
          waiting_room: options.settings?.waiting_room ?? false,
          email_notification: options.settings?.email_notification ?? true,
          participant_video: options.settings?.participant_video ?? true,
          registrants_confirmation_email: options.settings?.registrants_confirmation_email ?? true,
          registrants_email_notification: options.settings?.registrants_email_notification ?? true,
        }
      };

      const meetingRequest = {
        method: 'POST',
        maxBodyLength: Infinity,
        url: `${this.apiBaseUrl}/users/me/meetings`,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        data: JSON.stringify(meetingData)
      };

      const response = await axios.request(meetingRequest);
      
      return {
        id: response.data.id,
        join_url: response.data.join_url,
        start_url: response.data.start_url,
        topic: response.data.topic,
        start_time: response.data.start_time,
        duration: response.data.duration,
        password: response.data.password,
        created_at: response.data.created_at,
      };
    } catch (error: any) {
      console.error("Error creating Zoom meeting:", error.response?.data || error.message);
      throw new Error(`Failed to create Zoom meeting: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get meeting details by meeting ID
   */
  async getMeeting(meetingId: string): Promise<ZoomMeetingResponse> {
    try {
      const token = await this.getAccessToken();
      if (!token) {
        throw new Error("Failed to obtain access token");
      }

      const request = {
        method: 'GET',
        url: `${this.apiBaseUrl}/meetings/${meetingId}`,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };

      const response = await axios.request(request);
      
      return {
        id: response.data.id,
        join_url: response.data.join_url,
        start_url: response.data.start_url,
        topic: response.data.topic,
        start_time: response.data.start_time,
        duration: response.data.duration,
        password: response.data.password,
        created_at: response.data.created_at,
      };
    } catch (error: any) {
      console.error("Error getting Zoom meeting:", error.response?.data || error.message);
      throw new Error(`Failed to get Zoom meeting: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Delete a Zoom meeting
   */
  async deleteMeeting(meetingId: string): Promise<void> {
    try {
      const token = await this.getAccessToken();
      if (!token) {
        throw new Error("Failed to obtain access token");
      }

      const request = {
        method: 'DELETE',
        url: `${this.apiBaseUrl}/meetings/${meetingId}`,
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      };

      await axios.request(request);
    } catch (error: any) {
      console.error("Error deleting Zoom meeting:", error.response?.data || error.message);
      throw new Error(`Failed to delete Zoom meeting: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Generate a random password for meetings
   */
  private generateRandomPassword(): string {
    return Math.random().toString(36).slice(-8).toUpperCase();
  }
}

export const zoomService = new ZoomService();

