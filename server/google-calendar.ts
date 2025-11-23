import { google } from 'googleapis';

let calendarConnectionSettings: any;
let gmailConnectionSettings: any;

async function getCalendarAccessToken() {
  if (calendarConnectionSettings && calendarConnectionSettings.settings.expires_at && new Date(calendarConnectionSettings.settings.expires_at).getTime() > Date.now()) {
    return calendarConnectionSettings.settings.access_token;
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

  calendarConnectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-calendar',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = calendarConnectionSettings?.settings?.access_token || calendarConnectionSettings.settings?.oauth?.credentials?.access_token;

  if (!calendarConnectionSettings || !accessToken) {
    throw new Error('Google Calendar not connected');
  }
  return accessToken;
}

async function getGmailAccessToken() {
  if (gmailConnectionSettings && gmailConnectionSettings.settings.expires_at && new Date(gmailConnectionSettings.settings.expires_at).getTime() > Date.now()) {
    return gmailConnectionSettings.settings.access_token;
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

  gmailConnectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-mail',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = gmailConnectionSettings?.settings?.access_token || gmailConnectionSettings.settings?.oauth?.credentials?.access_token;

  if (!gmailConnectionSettings || !accessToken) {
    throw new Error('Gmail not connected');
  }
  return accessToken;
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
// Always call this function again to get a fresh client.
export async function getUncachableGoogleCalendarClient() {
  const accessToken = await getCalendarAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
// Always call this function again to get a fresh client.
export async function getUncachableGmailClient() {
  const accessToken = await getGmailAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.gmail({ version: 'v1', auth: oauth2Client });
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
  emailsSent: boolean;
  emailError?: string;
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
  const eventId = response.data.id || '';

  // Enviar emails personalizados desde notificationsedukt@gmail.com
  const emailResult = await sendClassInvitationEmails(details, meetLink, details.startTime, endTime);
  
  if (!emailResult.success) {
    console.error('⚠️  CRITICAL: Class invitation emails failed to send from notificationsedukt@gmail.com');
    console.error(`   Event ID: ${eventId}`);
    console.error(`   Tutor: ${details.tutorEmail}`);
    console.error(`   Student: ${details.studentEmail}`);
    console.error(`   Error: ${emailResult.error}`);
    console.warn('   Calendar notification emails sent as fallback (from Google Calendar)');
  } else {
    console.log(`✅ Class invitation emails sent successfully from notificationsedukt@gmail.com`);
    console.log(`   Note: Attendees will also receive Calendar notification emails`);
  }

  return {
    eventId,
    meetLink,
    emailsSent: emailResult.success,
    emailError: emailResult.error,
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

async function sendClassInvitationEmails(
  details: CalendarEventDetails, 
  meetLink: string, 
  startTime: Date, 
  endTime: Date
): Promise<{ success: boolean; error?: string }> {
  try {
    const gmail = await getUncachableGmailClient();
    
    const formatDate = (date: Date) => {
      return new Intl.DateTimeFormat('es-MX', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Mexico_City'
      }).format(date);
    };

    // Email para el tutor
    const tutorEmailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Nueva clase agendada</h2>
        <p>Hola ${details.tutorName},</p>
        <p>Se ha agendado una nueva clase con el estudiante <strong>${details.studentName}</strong>.</p>
        
        <div style="background-color: #f4f4f4; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Detalles de la clase</h3>
          <p><strong>Fecha y hora:</strong> ${formatDate(startTime)}</p>
          <p><strong>Duración:</strong> ${details.durationHours} hora(s)</p>
          <p><strong>Estudiante:</strong> ${details.studentName}</p>
          <p><strong>Email del estudiante:</strong> ${details.studentEmail}</p>
        </div>

        <div style="margin: 30px 0;">
          <a href="${meetLink}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Unirse a Google Meet</a>
        </div>

        <p style="color: #666; font-size: 14px;">Este evento también se ha agregado a tu calendario de Google.</p>
        <p style="color: #666; font-size: 14px;">Saludos,<br>El equipo de EDUKT</p>
      </div>
    `;

    const tutorMessage = [
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      `To: ${details.tutorEmail}`,
      'From: EDUKT <notificationsedukt@gmail.com>',
      `Subject: Nueva clase agendada - ${formatDate(startTime)}`,
      '',
      tutorEmailContent
    ].join('\n');

    const tutorBase64Email = Buffer.from(tutorMessage)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: tutorBase64Email,
      },
    });

    // Email para el estudiante
    const studentEmailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">¡Tu clase ha sido confirmada!</h2>
        <p>Hola ${details.studentName},</p>
        <p>Tu clase con <strong>${details.tutorName}</strong> ha sido confirmada y pagada exitosamente.</p>
        
        <div style="background-color: #f4f4f4; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Detalles de la clase</h3>
          <p><strong>Fecha y hora:</strong> ${formatDate(startTime)}</p>
          <p><strong>Duración:</strong> ${details.durationHours} hora(s)</p>
          <p><strong>Tutor:</strong> ${details.tutorName}</p>
          <p><strong>Email del tutor:</strong> ${details.tutorEmail}</p>
        </div>

        <div style="margin: 30px 0;">
          <a href="${meetLink}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Unirse a Google Meet</a>
        </div>

        <p style="color: #666; font-size: 14px;">Este evento también se ha agregado a tu calendario de Google.</p>
        <p style="color: #666; font-size: 14px;">Te deseamos una excelente clase,<br>El equipo de EDUKT</p>
      </div>
    `;

    const studentMessage = [
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      `To: ${details.studentEmail}`,
      'From: EDUKT <notificationsedukt@gmail.com>',
      `Subject: Clase confirmada con ${details.tutorName} - ${formatDate(startTime)}`,
      '',
      studentEmailContent
    ].join('\n');

    const studentBase64Email = Buffer.from(studentMessage)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: studentBase64Email,
      },
    });

    console.log(`Class invitation emails sent to ${details.tutorEmail} and ${details.studentEmail}`);
    return { success: true };
  } catch (error: any) {
    const errorMessage = error?.message || 'Unknown error sending class invitation emails';
    console.error('Error sending class invitation emails:', error);
    return { success: false, error: errorMessage };
  }
}

export async function sendPasswordResetEmail(email: string, resetToken: string, userType: 'tutor' | 'alumno'): Promise<boolean> {
  try {
    const gmail = await getUncachableGmailClient();
    
    const emailContent = `
      <h2>Restablecer tu contraseña</h2>
      <p>Recibimos una solicitud para restablecer tu contraseña en EDUKT.</p>
      <p>Tu código de reseteo es:</p>
      <p style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; font-size: 24px; font-weight: bold; letter-spacing: 2px; text-align: center; font-family: monospace;">${resetToken}</p>
      <p>Copia este código y pégalo en la página de reseteo de contraseña.</p>
      <p>Este código expira en 1 hora.</p>
      <p>Si no solicitaste restablecer tu contraseña, puedes ignorar este email de forma segura.</p>
    `;

    const message = [
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      `To: ${email}`,
      'From: EDUKT <notificationsedukt@gmail.com>',
      'Subject: Código para restablecer tu contraseña en EDUKT',
      '',
      emailContent
    ].join('\n');

    const base64EncodedEmail = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: base64EncodedEmail,
      },
    });
    
    console.log(`Password reset email sent to ${email}`);
    return true;
  } catch (error: any) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
}
