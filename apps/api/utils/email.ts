import { createMailer, defineTemplates, type EmailTransport } from '@starfall-kit/email';

function templates(frontendURL: string) {
  const link = (path: string, token: string) => {
    const url = new URL(path, frontendURL);

    url.searchParams.set('token', token);

    return url.toString();
  };

  return defineTemplates({
    verifyEmail: ({ token }: { token: string }) => ({
      subject: 'Confirm your email',
      text: `Confirm your email address: ${link('/verify-email', token)}`,
    }),
    resetPassword: ({ token }: { token: string }) => ({
      subject: 'Reset your password',
      text: `Choose a new password: ${link('/reset-password', token)}\n\nIgnore this email if you didn't ask for it.`,
    }),
  });
}

export function createAppMailer(transport: EmailTransport, from: string, frontendURL: string) {
  return createMailer({ transport, from, templates: templates(frontendURL) });
}

export type AppMailer = ReturnType<typeof createAppMailer>;
