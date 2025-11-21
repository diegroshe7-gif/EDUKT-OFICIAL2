import { google } from 'googleapis';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-calendar',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Google Calendar not connected');
  }
  return accessToken;
}

async function getUncachableGoogleCalendarClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

export interface CreateEventParams {
  summary: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  attendeeEmails: string[];
}

export interface CreateEventResult {
  eventId: string;
  meetLink: string;
}

export async function createCalendarEvent(params: CreateEventParams): Promise<CreateEventResult> {
  const calendar = await getUncachableGoogleCalendarClient();

  const event = {
    summary: params.summary,
    description: params.description || '',
    start: {
      dateTime: params.startTime.toISOString(),
      timeZone: 'America/Mexico_City',
    },
    end: {
      dateTime: params.endTime.toISOString(),
      timeZone: 'America/Mexico_City',
    },
    attendees: params.attendeeEmails.map(email => ({ email })),
    conferenceData: {
      createRequest: {
        requestId: `edukt-${Date.now()}`,
        conferenceSolutionKey: {
          type: 'hangoutsMeet'
        }
      }
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 },
        { method: 'popup', minutes: 30 },
      ],
    },
  };

  const response = await calendar.events.insert({
    calendarId: 'primary',
    conferenceDataVersion: 1,
    sendUpdates: 'all',
    requestBody: event,
  });

  const eventId = response.data.id!;
  const meetLink = response.data.hangoutLink || response.data.conferenceData?.entryPoints?.[0]?.uri || '';

  return { eventId, meetLink };
}

export async function deleteCalendarEvent(eventId: string): Promise<void> {
  const calendar = await getUncachableGoogleCalendarClient();

  await calendar.events.delete({
    calendarId: 'primary',
    eventId: eventId,
    sendUpdates: 'all',
  });
}
