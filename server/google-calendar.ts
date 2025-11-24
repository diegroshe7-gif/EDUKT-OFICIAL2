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
  
  // Create event in notificationsedukt@gmail.com calendar
  // The event will be organized by that email, and the Meet link will be public
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
      { email: details.tutorEmail, responseStatus: 'needsAction' },
      { email: details.studentEmail, responseStatus: 'needsAction' },
    ],
    organizer: {
      email: 'notificationsedukt@gmail.com',
      displayName: 'EDUKT Notificaciones',
    },
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
    visibility: 'public',
  };

  // Insert event into notificationsedukt@gmail.com calendar
  // If that fails, fall back to primary calendar
  let calendarId = 'notificationsedukt@gmail.com';
  
  let response;
  try {
    response = await calendar.events.insert({
      calendarId: calendarId,
      requestBody: event,
      conferenceDataVersion: 1,
      sendUpdates: 'none', // Don't send updates from calendar - we'll send our own emails
    });
    console.log(`✅ Event created in notificationsedukt@gmail.com calendar`);
  } catch (error: any) {
    console.warn(`⚠️  Could not create event in notificationsedukt@gmail.com calendar, trying primary calendar`);
    console.warn(`   Error: ${error?.message}`);
    
    // Remove organizer field and try primary
    delete (event as any).organizer;
    try {
      response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
        conferenceDataVersion: 1,
        sendUpdates: 'none',
      });
      console.log(`✅ Event created in primary calendar`);
    } catch (primaryError: any) {
      console.error('❌ Failed to create event in both calendars');
      throw primaryError;
    }
  }

  const meetLink = response.data.hangoutLink || response.data.conferenceData?.entryPoints?.[0]?.uri || '';
  const eventId = response.data.id || '';

  console.log(`✅ Google Meet link created (public, no login required): ${meetLink}`);

  // Enviar emails personalizados desde notificationsedukt@gmail.com
  const emailResult = await sendClassInvitationEmails(details, meetLink, details.startTime, endTime);
  
  if (!emailResult.success) {
    console.error('⚠️  CRITICAL: Class invitation emails failed to send from notificationsedukt@gmail.com');
    console.error(`   Event ID: ${eventId}`);
    console.error(`   Tutor: ${details.tutorEmail}`);
    console.error(`   Student: ${details.studentEmail}`);
    console.error(`   Error: ${emailResult.error}`);
  } else {
    console.log(`✅ Class invitation emails sent successfully from notificationsedukt@gmail.com`);
    console.log(`   Tutor: ${details.tutorEmail}`);
    console.log(`   Student: ${details.studentEmail}`);
    console.log(`   Meet Link: ${meetLink} (public - anyone can join)`);
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

export async function sendSupportTicketEmail(ticketDetails: {
  nombre: string;
  email: string;
  userType: string;
  asunto: string;
  mensaje: string;
}): Promise<boolean> {
  try {
    const gmail = await getUncachableGmailClient();
    
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Nuevo Ticket de Soporte - EDUKT</h2>
        <div style="background-color: #f4f4f4; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p><strong>De:</strong> ${ticketDetails.nombre}</p>
          <p><strong>Email:</strong> ${ticketDetails.email}</p>
          <p><strong>Tipo de usuario:</strong> ${ticketDetails.userType}</p>
          <p><strong>Asunto:</strong> ${ticketDetails.asunto}</p>
        </div>
        <div style="background-color: #ffffff; padding: 20px; border: 1px solid #e5e7eb; border-radius: 5px;">
          <h3>Mensaje:</h3>
          <p style="white-space: pre-wrap;">${ticketDetails.mensaje}</p>
        </div>
        <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">
          Este email fue enviado automáticamente desde el sistema de soporte de EDUKT.
        </p>
      </div>
    `;

    const message = [
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      'To: notificationsedukt@gmail.com',
      `From: EDUKT Soporte <notificationsedukt@gmail.com>`,
      `Reply-To: ${ticketDetails.email}`,
      `Subject: [SOPORTE] ${ticketDetails.asunto}`,
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
    
    console.log(`Support ticket email sent to notificationsedukt@gmail.com from ${ticketDetails.email}`);
    return true;
  } catch (error: any) {
    console.error('Error sending support ticket email:', error);
    throw error;
  }
}

export async function sendTutorApprovalEmail(tutorName: string, tutorEmail: string): Promise<boolean> {
  try {
    const gmail = await getUncachableGmailClient();
    
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981;">¡Bienvenido a EDUKT!</h2>
        <p>Hola ${tutorName},</p>
        <p>¡Felicidades! Tu perfil ha sido aprobado y ahora eres parte de nuestra comunidad de tutores en EDUKT.</p>
        
        <div style="background-color: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
          <h3 style="margin-top: 0; color: #047857;">Tu perfil está activo</h3>
          <p>Los estudiantes ahora pueden ver tu perfil y reservar clases contigo. Asegúrate de mantener tu disponibilidad actualizada para recibir más solicitudes.</p>
        </div>

        <div style="margin: 30px 0;">
          <h3>Próximos pasos:</h3>
          <ul style="line-height: 1.8;">
            <li>Actualiza tu calendario de disponibilidad regularmente</li>
            <li>Prepara tus materiales de enseñanza</li>
            <li>Mantén una comunicación activa con tus estudiantes</li>
            <li>Completa tus clases a tiempo para recibir buenas calificaciones</li>
          </ul>
        </div>

        <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Pagos:</strong> Recibirás el 92% del valor de cada clase directamente en tu cuenta bancaria registrada después de completar la sesión.</p>
        </div>

        <p style="color: #666; font-size: 14px;">Si tienes alguna pregunta, no dudes en contactarnos.</p>
        <p style="color: #666; font-size: 14px;">¡Mucho éxito!<br>El equipo de EDUKT</p>
      </div>
    `;

    const message = [
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      `To: ${tutorEmail}`,
      'From: EDUKT <notificationsedukt@gmail.com>',
      'Subject: ¡Tu perfil ha sido aprobado en EDUKT!',
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
    
    console.log(`Approval email sent to ${tutorEmail}`);
    return true;
  } catch (error: any) {
    console.error('Error sending tutor approval email:', error);
    throw error;
  }
}

export async function sendTutorRejectionEmail(tutorName: string, tutorEmail: string): Promise<boolean> {
  try {
    const gmail = await getUncachableGmailClient();
    
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Actualización de tu solicitud en EDUKT</h2>
        <p>Hola ${tutorName},</p>
        <p>Gracias por tu interés en formar parte de nuestra comunidad de tutores en EDUKT.</p>
        
        <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
          <p style="margin: 0;">Lamentablemente, después de revisar tu perfil, hemos determinado que en este momento no cumple con todos nuestros requisitos para ser tutor en nuestra plataforma.</p>
        </div>

        <div style="margin: 30px 0;">
          <h3>¿Qué puedes hacer?</h3>
          <p>Te invitamos a revisar los siguientes aspectos de tu perfil:</p>
          <ul style="line-height: 1.8;">
            <li>Verifica que tu información personal esté completa y correcta</li>
            <li>Asegúrate de haber proporcionado toda la documentación requerida</li>
            <li>Revisa que tus credenciales y experiencia estén claramente descritas</li>
            <li>Confirma que tu información bancaria esté correcta (CLABE, RFC, banco)</li>
          </ul>
          <p>Puedes volver a aplicar en cualquier momento una vez que hayas actualizado tu información.</p>
        </div>

        <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0;"><strong>¿Necesitas ayuda?</strong> Si tienes preguntas sobre los requisitos o deseas más información, contáctanos respondiendo a este correo.</p>
        </div>

        <p style="color: #666; font-size: 14px;">Agradecemos tu comprensión y esperamos poder trabajar contigo en el futuro.</p>
        <p style="color: #666; font-size: 14px;">Saludos,<br>El equipo de EDUKT</p>
      </div>
    `;

    const message = [
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      `To: ${tutorEmail}`,
      'From: EDUKT <notificationsedukt@gmail.com>',
      'Subject: Actualización de tu solicitud en EDUKT',
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
    
    console.log(`Rejection email sent to ${tutorEmail}`);
    return true;
  } catch (error: any) {
    console.error('Error sending tutor rejection email:', error);
    throw error;
  }
}
