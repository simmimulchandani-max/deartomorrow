import { Heading, Section, Text } from "@react-email/components";
import EmailButton from "@/emails/components/EmailButton";
import EmailFooter from "@/emails/components/EmailFooter";
import EmailLayout from "@/emails/components/EmailLayout";

type GiftCapsuleRecipientEmailProps = {
  logoUrl: string;
  recipientName?: string | null;
  ownerDisplayName?: string | null;
  recipientNote?: string | null;
  unlockUrl: string;
};

export default function GiftCapsuleRecipientEmail({
  logoUrl,
  recipientName,
  ownerDisplayName,
  recipientNote,
  unlockUrl,
}: GiftCapsuleRecipientEmailProps) {
  const greeting = recipientName?.trim() || "there";
  const creator = ownerDisplayName?.trim() || "Someone";
  const note = recipientNote?.trim() || null;

  return (
    <EmailLayout
      logoUrl={logoUrl}
      preview={`${creator} created a time capsule for you with memories from your friends.`}
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
        Your friends made you something
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
        Hi {greeting}, {creator} created a time capsule for you with memories
        from your friends.
      </Text>

      {note ? (
        <Section
          style={{
            backgroundColor: "#f8f1e8",
            border: "1px solid #eadfce",
            borderRadius: "18px",
            margin: "0 0 26px",
            padding: "20px",
          }}
        >
          <Text
            style={{
              color: "#5b4d43",
              fontSize: "15px",
              lineHeight: "24px",
              margin: 0,
              whiteSpace: "pre-wrap",
            }}
          >
            {note}
          </Text>
        </Section>
      ) : null}

      <Section style={{ textAlign: "center" }}>
        <EmailButton href={unlockUrl}>Open Capsule</EmailButton>
      </Section>

      <EmailFooter>With love, Until Tomorrow</EmailFooter>
    </EmailLayout>
  );
}
