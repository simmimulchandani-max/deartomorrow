import { Heading, Text } from "@react-email/components";
import EmailFooter from "@/emails/components/EmailFooter";
import EmailLayout from "@/emails/components/EmailLayout";

type GiftCapsuleOwnerConfirmationEmailProps = {
  logoUrl: string;
  recipientName?: string | null;
};

export default function GiftCapsuleOwnerConfirmationEmail({
  logoUrl,
  recipientName,
}: GiftCapsuleOwnerConfirmationEmailProps) {
  const recipient = recipientName?.trim() || "your recipient";

  return (
    <EmailLayout
      logoUrl={logoUrl}
      preview={`Your capsule for ${recipient} was sent today.`}
    >
      <Heading
        as="h1"
        style={{
          color: "#4a3c31",
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: "34px",
          fontWeight: 600,
          lineHeight: "40px",
          margin: "0 0 14px",
          textAlign: "center",
        }}
      >
        Your gift capsule was sent
      </Heading>

      <Text
        style={{
          color: "#5b4d43",
          fontSize: "16px",
          lineHeight: "26px",
          margin: "0 auto 24px",
          maxWidth: "460px",
          textAlign: "center",
        }}
      >
        Your capsule for {recipient} was sent today.
      </Text>

      <EmailFooter>Thank you for preserving moments with Until Tomorrow.</EmailFooter>
    </EmailLayout>
  );
}
