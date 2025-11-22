import { google } from 'googleapis';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
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

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
// Always call this function again to get a fresh client.
export async function getUncachableGoogleCalendarClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

export interface CalendarEventDetails {
  tutorName: string;
  tutorEmail: string;
  studentName: string;
  studentEmail: string;
  startTime: Date;
  durationHours: number;
}

export interface CalendarEventResult {
  eventId: string;
  meetLink: string;
}

export async function createTutoringSession(details: CalendarEventDetails): Promise<CalendarEventResult> {
  const calendar = await getUncachableGoogleCalendarClient();
  
  const endTime = new Date(details.startTime.getTime() + details.durationHours * 60 * 60 * 1000);
  
  const event = {
    summary: `Tutoría con ${details.tutorName}`,
    description: `Sesión de tutoría con ${details.tutorName}\n\nEstudiante: ${details.studentName}`,
    start: {
      dateTime: details.startTime.toISOString(),
      timeZone: 'America/Mexico_City',
    },
    end: {
      dateTime: endTime.toISOString(),
      timeZone: 'America/Mexico_City',
    },
    attendees: [
      { email: details.tutorEmail },
      { email: details.studentEmail },
    ],
    conferenceData: {
      createRequest: {
        requestId: `edukt-${Date.now()}`,
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
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
    requestBody: event,
    conferenceDataVersion: 1,
    sendUpdates: 'all',
  });

  const meetLink = response.data.hangoutLink || response.data.conferenceData?.entryPoints?.[0]?.uri || '';

  return {
    eventId: response.data.id || '',
    meetLink,
  };
}

export async function deleteCalendarEvent(eventId: string): Promise<void> {
  const calendar = await getUncachableGoogleCalendarClient();
  
  await calendar.events.delete({
    calendarId: 'primary',
    eventId: eventId,
    sendUpdates: 'all',
  });
}

export async function sendPasswordResetEmail(email: string, resetToken: string, userType: 'tutor' | 'alumno'): Promise<boolean> {
  try {
    const accessToken = await getAccessToken();
    
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
      access_token: accessToken
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    
    const resetLink = `${process.env.VITE_API_BASE_URL || 'http://localhost:5000'}/reset-password?token=${resetToken}&type=${userType}`;
    
    const emailContent = `
      <h2>Restablecer tu contraseña</h2>
      <p>Recibimos una solicitud para restablecer tu contraseña en EDUKT.</p>
      <p>Haz clic en el siguiente enlace para crear una nueva contraseña:</p>
      <p><a href="${resetLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Restablecer Contraseña</a></p>
      <p>Este enlace expira en 1 hora.</p>
      <p>Si no solicitaste restablecer tu contraseña, puedes ignorar este email de forma segura.</p>
    `;

    const message = `From: noreply@edukt.com
To: ${email}
Subject: Restablecer tu contraseña en EDUKT
Content-Type: text/html; charset=utf-8

${emailContent}`;

    const base64EncodedEmail = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: base64EncodedEmail,
      },
    });
    
    return true;
  } catch (error: any) {
    if (error.status === 403 && error.message?.includes('insufficient authentication scopes')) {
      console.warn('Gmail scope not authorized in Google Calendar connection. Email sending requires re-authorization.');
      return false;
    }
    throw error;
  }
}
