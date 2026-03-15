import { Resend } from "resend";
import nodemailer from "nodemailer";

// Email provider types
type EmailProvider = "resend" | "hostinger" | "smtp";

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

class EmailService {
  private resend: Resend | null = null;
  private smtpTransport: nodemailer.Transporter | null = null;
  private provider: EmailProvider;
  private defaultFrom: string;

  constructor() {
    this.defaultFrom =
      process.env.EMAIL_FROM || "PixelReel <noreply@pixelreel.com>";

    // Determine provider based on env vars
    if (process.env.RESEND_API_KEY) {
      this.provider = "resend";
      this.resend = new Resend(process.env.RESEND_API_KEY);
    } else if (process.env.SMTP_HOST) {
      this.provider = "hostinger";
      this.smtpTransport = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 465,
        secure: true,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    } else {
      this.provider = "smtp";
      console.warn("⚠️ No email provider configured");
    }
  }

  async send(
    options: EmailOptions
  ): Promise<{ success: boolean; id?: string; error?: string }> {
    const from = options.from || this.defaultFrom;

    try {
      if (this.provider === "resend" && this.resend) {
        const { data, error } = await this.resend.emails.send({
          from,
          to: Array.isArray(options.to) ? options.to : [options.to],
          subject: options.subject,
          html: options.html,
          text: options.text,
        });

        if (error) {
          console.error("Resend error:", error);
          return { success: false, error: error.message };
        }

        return { success: true, id: data?.id };
      }

      if (
        (this.provider === "hostinger" || this.provider === "smtp") &&
        this.smtpTransport
      ) {
        const info = await this.smtpTransport.sendMail({
          from,
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text,
        });

        return { success: true, id: info.messageId };
      }

      return { success: false, error: "No email provider configured" };
    } catch (e: any) {
      console.error("Email send error:", e);
      return { success: false, error: e.message };
    }
  }

  // Pre-built templates
  async sendVerificationEmail(to: string, token: string, username: string) {
    const verifyUrl = `${process.env.FRONTEND_URL}/auth/verify?token=${token}`;

    return this.send({
      to,
      subject: "Verifique sua conta - PixelReel",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #6366f1;">Bem-vindo ao PixelReel, ${username}!</h1>
          <p>Clique no botão abaixo para verificar sua conta:</p>
          <a href="${verifyUrl}" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 16px 0;">
            Verificar Email
          </a>
          <p style="color: #666; font-size: 12px;">Se você não criou esta conta, ignore este email.</p>
        </div>
      `,
    });
  }

  async sendPasswordResetEmail(to: string, token: string) {
    const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password?token=${token}`;

    return this.send({
      to,
      subject: "Redefinir senha - PixelReel",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #6366f1;">Redefinir Senha</h1>
          <p>Você solicitou uma redefinição de senha. Clique no botão abaixo:</p>
          <a href="${resetUrl}" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 16px 0;">
            Redefinir Senha
          </a>
          <p style="color: #666; font-size: 12px;">Este link expira em 1 hora. Se você não solicitou, ignore este email.</p>
        </div>
      `,
    });
  }

  async sendWelcomeEmail(to: string, username: string) {
    return this.send({
      to,
      subject: "Bem-vindo ao PixelReel! 🎬",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #6366f1;">Olá, ${username}! 🎉</h1>
          <p>Sua conta foi verificada com sucesso. Agora você pode:</p>
          <ul>
            <li>📝 Criar reviews de filmes e séries</li>
            <li>📋 Organizar suas listas</li>
            <li>🏆 Conquistar achievements</li>
            <li>👥 Seguir outros cinéfilos</li>
          </ul>
          <a href="${process.env.FRONTEND_URL}" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 16px 0;">
            Explorar PixelReel
          </a>
        </div>
      `,
    });
  }

  async sendAccountDeletionConfirmation(to: string, token: string) {
    const confirmUrl = `${process.env.FRONTEND_URL}/settings/delete-account?token=${token}`;

    return this.send({
      to,
      subject: "⚠️ Confirmar exclusão de conta - PixelReel",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #ef4444;">Confirmar Exclusão de Conta</h1>
          <p>Você solicitou a exclusão permanente da sua conta. Esta ação:</p>
          <ul style="color: #dc2626;">
            <li>Apagará todos os seus dados</li>
            <li>Removerá reviews, listas e diário</li>
            <li>É <strong>irreversível</strong></li>
          </ul>
          <a href="${confirmUrl}" style="display: inline-block; background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 16px 0;">
            Confirmar Exclusão
          </a>
          <p style="color: #666; font-size: 12px;">Este link expira em 24 horas.</p>
        </div>
      `,
    });
  }
}

export const emailService = new EmailService();
