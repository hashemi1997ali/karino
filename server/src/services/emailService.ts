import { BrevoClient, BrevoError } from "@getbrevo/brevo";

import { AppError } from "#utils";

interface TransactionalEmailInput {
  to: { email: string; name: string };
  subject: string;
  htmlContent: string;
  replyTo?: { email: string; name?: string };
  tags?: string[];
}

export const escapeHtml = (value: string): string =>
  value.replace(
    /[&<>'"]/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        character
      ] ?? character,
  );

export const ensureTransactionalEmailConfigured = (): void => {
  if (!process.env.BREVO_API_KEY?.trim() || !process.env.BREVO_SENDER_EMAIL?.trim()) {
    throw new AppError("Email delivery is temporarily unavailable", 503);
  }
};

export const sendTransactionalEmail = async (
  input: TransactionalEmailInput,
): Promise<string> => {
  ensureTransactionalEmailConfigured();
  const apiKey = process.env.BREVO_API_KEY!.trim();
  const senderEmail = process.env.BREVO_SENDER_EMAIL!.trim();
  const senderName = process.env.BREVO_SENDER_NAME?.trim() || "Karino";
  const brevo = new BrevoClient({
    apiKey,
    timeoutInSeconds: 15,
    maxRetries: 2,
  });

  try {
    const response = await brevo.transactionalEmails.sendTransacEmail({
      sender: { email: senderEmail, name: senderName },
      to: [input.to],
      subject: input.subject,
      htmlContent: input.htmlContent,
      ...(input.replyTo ? { replyTo: input.replyTo } : {}),
      ...(input.tags?.length ? { tags: input.tags } : {}),
    });

    if (!response.messageId) {
      throw new AppError("Email delivery failed", 502, {
        provider: "brevo",
        providerMessage: "Brevo did not return a message ID",
      });
    }

    return response.messageId;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    if (error instanceof BrevoError) {
      throw new AppError("Email delivery failed", 502, {
        provider: "brevo",
        status: error.statusCode,
        requestId: error.requestId,
        providerMessage: error.message,
        providerBody: error.body,
      });
    }

    throw new AppError("Email delivery failed", 502, {
      provider: "brevo",
      providerMessage: error instanceof Error ? error.message : "Unknown Brevo SDK error",
    });
  }
};

const emailShell = (content: string): string => `<!doctype html>
<html><body style="margin:0;background:#f5f4ef;font-family:Arial,sans-serif;color:#171a18">
<div style="max-width:640px;margin:0 auto;padding:32px 18px">
<div style="background:#fff;border:1px solid #e5e2d8;border-radius:22px;padding:28px">
<div style="font-size:22px;font-weight:800;color:#f15a38;margin-bottom:22px">Karino</div>
${content}
</div></div></body></html>`;

export const sendPasswordResetEmail = async ({
  email,
  name,
  token,
  locale,
}: {
  email: string;
  name: string;
  token: string;
  locale: "en" | "de";
}): Promise<string> => {
  const appUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(token)}`;
  const german = locale === "de";
  const subject = german ? "Karino-Passwort zurücksetzen" : "Reset your Karino password";
  const htmlContent = emailShell(`
    <h1 style="font-size:24px;margin:0 0 14px">${german ? "Passwort zurücksetzen" : "Reset your password"}</h1>
    <p style="line-height:1.7">${german ? `Hallo ${escapeHtml(name)}, über den folgenden Link kannst du ein neues Passwort festlegen.` : `Hello ${escapeHtml(name)}, use the link below to choose a new password.`}</p>
    <p style="margin:26px 0"><a href="${resetUrl}" style="display:inline-block;background:#f15a38;color:#fff;text-decoration:none;padding:13px 20px;border-radius:999px;font-weight:700">${german ? "Neues Passwort festlegen" : "Choose a new password"}</a></p>
    <p style="font-size:13px;line-height:1.7;color:#68706b">${german ? "Der Link ist zeitlich begrenzt und kann nur einmal verwendet werden. Falls du diese Anfrage nicht gestellt hast, kannst du diese E-Mail ignorieren." : "This link expires soon and can only be used once. If you did not request it, you can ignore this email."}</p>
  `);
  return sendTransactionalEmail({
    to: { email, name },
    subject,
    htmlContent,
    tags: ["password-reset"],
  });
};

export const sendContactReplyEmail = async ({
  email,
  name,
  message,
  locale,
}: {
  email: string;
  name: string;
  message: string;
  locale: "en" | "de";
}): Promise<string> => {
  const german = locale === "de";
  const footer =
    (german
      ? process.env.CONTACT_REPLY_FOOTER_DE
      : process.env.CONTACT_REPLY_FOOTER_EN
    )?.trim() ||
    (german
      ? "Für eine neue Nachricht verwende bitte erneut das Kontaktformular auf unserer Website."
      : "For a new message, please use the contact form on our website again.");
  const contactEmail = process.env.CONTACT_EMAIL?.trim();
  return sendTransactionalEmail({
    to: { email, name },
    subject:
      (german
        ? process.env.CONTACT_REPLY_SUBJECT_DE
        : process.env.CONTACT_REPLY_SUBJECT_EN
      )?.trim() ||
      (german ? "Antwort auf deine Karino-Anfrage" : "Reply to your Karino message"),
    htmlContent: emailShell(`
      <h1 style="font-size:24px;margin:0 0 14px">${german ? "Unsere Antwort" : "Our reply"}</h1>
      <p style="line-height:1.75;white-space:pre-wrap">${escapeHtml(message)}</p>
      <hr style="border:0;border-top:1px solid #e5e2d8;margin:24px 0">
      <p style="font-size:13px;line-height:1.7;color:#68706b">${escapeHtml(footer)}</p>
    `),
    ...(contactEmail
      ? {
          replyTo: {
            email: contactEmail,
            name: process.env.BREVO_SENDER_NAME || "Karino",
          },
        }
      : {}),
    tags: ["contact-reply"],
  });
};
