import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
} from "@react-email/components";
import EmailHeader from "@/emails/components/EmailHeader";

type EmailLayoutProps = {
  logoUrl: string;
  preview: string;
  children: React.ReactNode;
};

export default function EmailLayout({
  logoUrl,
  preview,
  children,
}: EmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: "#f5f0e6",
          color: "#4a3c31",
          fontFamily:
            "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          margin: 0,
          padding: 0,
        }}
      >
        <Section
          style={{
            backgroundColor: "#f5f0e6",
            padding: "28px 12px",
          }}
        >
          <Container
            style={{
              margin: "0 auto",
              maxWidth: "600px",
              width: "100%",
            }}
          >
            <EmailHeader logoUrl={logoUrl} />
            <Section
              style={{
                backgroundColor: "#fffaf2",
                border: "1px solid #eadfce",
                borderRadius: "24px",
                boxShadow: "0 12px 30px rgba(74, 60, 49, 0.08)",
                padding: "30px 24px",
              }}
            >
              {children}
            </Section>
          </Container>
        </Section>
      </Body>
    </Html>
  );
}
