import { Heading, Img, Section, Text } from "@react-email/components";
import EmailButton from "@/emails/components/EmailButton";
import EmailFooter from "@/emails/components/EmailFooter";
import EmailLayout from "@/emails/components/EmailLayout";

type UnlockMemoryEmailProps = {
  logoUrl: string;
  memoryTitle: string;
  unlockDate: string;
  unlockUrl: string;
  previewImageUrl?: string | null;
};

export default function UnlockMemoryEmail({
  logoUrl,
  memoryTitle,
  unlockDate,
  unlockUrl,
  previewImageUrl = null,
}: UnlockMemoryEmailProps) {
  const title = memoryTitle.trim() || "Untitled Memory";

  return (
    <EmailLayout
      logoUrl={logoUrl}
      preview="A memory you saved for your future self is ready to be opened."
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
        Your memory is waiting for you
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
        A memory you saved for your future self is ready to be opened.
      </Text>

      <Section
        style={{
          backgroundColor: "#f8f1e8",
          border: "1px solid #eadfce",
          borderRadius: "18px",
          margin: "0 0 26px",
          padding: "18px",
        }}
      >
        {previewImageUrl ? (
          <Section
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #efe5d6",
              borderRadius: "14px",
              marginBottom: "16px",
              padding: "10px 10px 16px",
            }}
          >
            <Img
              src={previewImageUrl}
              alt={`Preview for ${title}`}
              width="500"
              style={{
                borderRadius: "10px",
                display: "block",
                height: "auto",
                maxHeight: "280px",
                objectFit: "cover",
                width: "100%",
              }}
            />
          </Section>
        ) : null}

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
          Memory
        </Text>
        <Text
          style={{
            color: "#4a3c31",
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: "24px",
            fontWeight: 600,
            lineHeight: "30px",
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
            margin: 0,
          }}
        >
          Unlock date: {unlockDate}
        </Text>
      </Section>

      <Section style={{ textAlign: "center" }}>
        <EmailButton href={unlockUrl}>Open Memory</EmailButton>
      </Section>

      <EmailFooter>
        Thank you for trusting Until Tomorrow with your memories.
      </EmailFooter>
    </EmailLayout>
  );
}
