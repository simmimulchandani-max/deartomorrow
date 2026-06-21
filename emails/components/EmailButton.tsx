import { Button } from "@react-email/components";

type EmailButtonProps = {
  href: string;
  children: React.ReactNode;
};

export default function EmailButton({ href, children }: EmailButtonProps) {
  return (
    <Button
      href={href}
      style={{
        backgroundColor: "#f7c7b6",
        border: "1px solid #e7b6a4",
        borderRadius: "999px",
        color: "#4a3c31",
        display: "inline-block",
        fontFamily:
          "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        fontSize: "15px",
        fontWeight: 700,
        letterSpacing: "0.06em",
        lineHeight: "22px",
        minWidth: "160px",
        padding: "14px 24px",
        textAlign: "center",
        textDecoration: "none",
        textTransform: "uppercase",
      }}
    >
      {children}
    </Button>
  );
}
