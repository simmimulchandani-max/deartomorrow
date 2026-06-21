import { Heading, Section, Text } from "@react-email/components";
import EmailButton from "@/emails/components/EmailButton";
import EmailFooter from "@/emails/components/EmailFooter";
import EmailLayout from "@/emails/components/EmailLayout";

type UnlockCapsuleEmailProps = {
  logoUrl: string;
  capsuleTitle: string;
  unlockDate: string;
  unlockUrl: string;
  memoryCount?: number | null;
};

export default function UnlockCapsuleEmail({
  logoUrl,
  capsuleTitle,
  unlockDate,
  unlockUrl,
  memoryCount = null,
}: UnlockCapsuleEmailProps) {
  const title = capsuleTitle.trim() || "Your capsule";
  const memoryLabel =
    typeof memoryCount === "number"
      ? `${memoryCount} ${memoryCount === 1 ? "memory" : "memories"} inside`
      : null;

  return (
    <EmailLayout
      logoUrl={logoUrl}
      preview="The moment has arrived. Your capsule is now available to open and revisit."
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
        Your capsule is ready
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
        The moment has arrived. Your capsule is now available to open and
        revisit.
      </Text>

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
            color: "#8a786d",
            fontSize: "12px",
            fontWeight: 700,
            letterSpacing: "0.14em",
            lineHeight: "18px",
            margin: "0 0 8px",
            textTransform: "uppercase",
          }}
        >
          Capsule
        </Text>
        <Text
          style={{
            color: "#4a3c31",
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: "25px",
            fontWeight: 600,
            lineHeight: "31px",
            margin: "0 0 10px",
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            color: "#6f5f55",
            fontSize: "14px",
            lineHeight: "22px",
            margin: "0 0 6px",
          }}
        >
          Unlock date: {unlockDate}
        </Text>
        {memoryLabel ? (
          <Text
            style={{
              color: "#6f5f55",
              fontSize: "14px",
              lineHeight: "22px",
              margin: 0,
            }}
          >
            {memoryLabel}
          </Text>
        ) : null}
      </Section>

      <Section style={{ textAlign: "center" }}>
        <EmailButton href={unlockUrl}>Open Capsule</EmailButton>
      </Section>

      <EmailFooter>
        Thank you for preserving moments with Until Tomorrow.
      </EmailFooter>
    </EmailLayout>
  );
}
