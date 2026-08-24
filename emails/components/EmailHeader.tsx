import { Img, Section, Text } from "@react-email/components";

type EmailHeaderProps = {
  logoUrl: string;
};

export default function EmailHeader({ logoUrl }: EmailHeaderProps) {
  return (
    <Section style={{ padding: "0 0 22px", textAlign: "center" }}>
      <Img
        src={logoUrl}
        width="104"
        alt="Until Tomorrow"
        style={{
          display: "block",
          margin: "0 auto 12px",
          height: "auto",
          maxWidth: "104px",
          width: "104px",
        }}
      />
      <Text
        style={{
          color: "#8a786d",
          fontFamily:
            "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          fontSize: "12px",
          fontWeight: 700,
          letterSpacing: "0.18em",
          lineHeight: "18px",
          margin: 0,
          textTransform: "uppercase",
        }}
      >
        Until Tomorrow
      </Text>
    </Section>
  );
}
